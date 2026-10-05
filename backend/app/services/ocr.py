"""
Text extraction for uploaded documents (text PDFs, scanned PDFs and images).

Shared by the single-document OCR endpoint and the batch worker so both
produce the same results.
"""
import os

import pymupdf
import pytesseract
from flask import current_app
from PIL import Image

from ..processors.glm_ocr import GlmOcrProcessor
from .text_files import convert_text_file_to_pdf, extract_text_from_text_file, is_text_file

RENDER_DPI = 300
LOW_CONFIDENCE_THRESHOLD = 80
HANDWRITTEN_CONFIG = r'--oem 1 --psm 6'


def no_progress(current, total, message):
    """Default progress callback for synchronous calls."""
TESSERACT_MISSING_MESSAGE = (
    'Tesseract OCR is not installed.\n\nTo extract text from images, please install Tesseract OCR:\n'
    '- Windows: https://github.com/UB-Mannheim/tesseract/wiki\n'
    '- macOS: brew install tesseract\n'
    '- Linux: sudo apt-get install tesseract-ocr'
)


def tesseract_available():
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def ocr_image(image, lang='eng'):
    """
    OCR one image with a single Tesseract pass.

    Returns (text, low_confidence_words, mean_confidence, word_count). Text is
    rebuilt from word boxes with line and paragraph breaks, which matches
    image_to_string output, so the confidence data comes for free instead of
    costing a second OCR run.
    """
    data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
    lines, order, low_conf = {}, [], []
    conf_total, conf_count = 0.0, 0
    for i, word in enumerate(data['text']):
        if data['level'][i] != 5:
            continue
        word = word.strip()
        if not word:
            continue
        key = (data['block_num'][i], data['par_num'][i], data['line_num'][i])
        if key not in lines:
            lines[key] = []
            order.append(key)
        lines[key].append(word)
        conf = float(data['conf'][i])
        if conf >= 0:
            conf_total += conf
            conf_count += 1
        if 0 <= conf < LOW_CONFIDENCE_THRESHOLD:
            low_conf.append({'word': word, 'conf': conf})

    out, prev = [], None
    for key in order:
        if prev is not None and key[:2] != prev[:2]:
            out.append('')
        out.append(' '.join(lines[key]))
        prev = key
    text = '\n'.join(out)

    # Sparse result: retry with the LSTM engine, which copes better with handwriting.
    if len(text.strip()) < 20:
        retry = pytesseract.image_to_string(image, lang=lang, config=HANDWRITTEN_CONFIG)
        if len(retry.strip()) > len(text.strip()):
            text = retry
    mean = conf_total / conf_count if conf_count else None
    return text, low_conf, mean, conf_count


def _searchable_pdf_path(filepath):
    stem = os.path.splitext(os.path.basename(filepath))[0]
    return os.path.join(current_app.config['UPLOAD_FOLDER'], f'ocr_{stem}.pdf')


def _extract_pdf_text_layer(doc):
    return '\n\n'.join(page.get_text().strip() for page in doc).strip()


def _ocr_scanned_pdf(doc, filepath, lang, progress):
    """Render each page, OCR it and assemble a searchable (sandwich) PDF."""
    texts, confidence = [], []
    conf_total, conf_count = 0.0, 0
    merged = pymupdf.open()
    has_pdf_pages = False
    total = len(doc)
    for page_idx, page in enumerate(doc):
        progress(page_idx, total, f'Recognising page {page_idx + 1} of {total}')
        pix = page.get_pixmap(dpi=RENDER_DPI)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        try:
            page_pdf = pytesseract.image_to_pdf_or_hocr(img, extension='pdf', lang=lang)
            with pymupdf.open('pdf', page_pdf) as single:
                merged.insert_pdf(single)
            has_pdf_pages = True
        except Exception as e:
            current_app.logger.warning('Searchable PDF page %s failed: %s', page_idx + 1, e)
        page_text, page_conf, page_mean, page_words = ocr_image(img, lang)
        if page_mean is not None:
            conf_total += page_mean * page_words
            conf_count += page_words
        for item in page_conf:
            item['page'] = page_idx + 1
        confidence.extend(page_conf)
        texts.append(page_text)

    progress(total, total, 'Saving searchable PDF')
    ocr_pdf_path = None
    if has_pdf_pages:
        ocr_pdf_path = _searchable_pdf_path(filepath)
        merged.save(ocr_pdf_path, garbage=3, deflate=True)
    merged.close()
    mean = conf_total / conf_count if conf_count else None
    return '\n\n'.join(texts), confidence, ocr_pdf_path, mean


def _extract_pdf(filepath, lang, progress):
    if is_text_file(filepath):
        if convert_text_file_to_pdf(filepath):
            with pymupdf.open(filepath) as doc:
                text = _extract_pdf_text_layer(doc)
            return {'text': text or 'Converted PDF but no text could be extracted.',
                    'file_type': 'text file (auto-converted to PDF)'}
        return {'text': extract_text_from_text_file(filepath),
                'file_type': 'text file (conversion failed, extracted as-is)'}

    try:
        doc = pymupdf.open(filepath)
    except Exception as e:
        return {'text': f'Error opening PDF: {e}', 'file_type': 'PDF (Error)'}

    with doc:
        progress(0, 1, 'Reading PDF text layer')
        text = _extract_pdf_text_layer(doc)
        if len(text) >= 50:
            return {'text': text, 'file_type': 'PDF'}

        # Little or no text layer: treat as a scanned document.
        if not tesseract_available():
            return {'text': text or TESSERACT_MISSING_MESSAGE, 'file_type': 'PDF (OCR unavailable)'}
        try:
            ocr_text, confidence, ocr_pdf_path, mean_conf = _ocr_scanned_pdf(doc, filepath, lang, progress)
        except Exception as e:
            current_app.logger.exception('Scanned PDF OCR failed')
            return {'text': text or f'No text found in PDF. OCR failed: {e}', 'file_type': 'PDF (OCR Failed)'}

    if ocr_text.strip():
        return {'text': ocr_text, 'file_type': 'PDF (Scanned/OCR)',
                'confidence': confidence, 'ocr_pdf_path': ocr_pdf_path, 'mean_confidence': mean_conf}
    return {'text': text or 'No text found in PDF (OCR produced no results).', 'file_type': 'PDF (Empty)',
            'ocr_pdf_path': ocr_pdf_path}


def _extract_image(filepath, lang, engine, progress):
    progress(0, 1, 'Recognising text')
    if engine == 'glm-ocr':
        try:
            result = GlmOcrProcessor().process_image(filepath)
            if not result.get('success'):
                raise RuntimeError(result.get('error', 'GLM-OCR failed'))
            return {'text': result.get('main_text', ''), 'file_type': 'image (GLM-OCR)'}
        except Exception as e:
            return {'text': f'GLM-OCR error: {e}', 'file_type': 'image (GLM-OCR error)'}

    if not tesseract_available():
        return {'text': TESSERACT_MISSING_MESSAGE, 'file_type': 'image'}
    try:
        with Image.open(filepath) as image:
            image.load()
            text, confidence, mean_conf, _words = ocr_image(image, lang)
            ocr_pdf_path = None
            try:
                pdf_bytes = pytesseract.image_to_pdf_or_hocr(image, extension='pdf', lang=lang)
                ocr_pdf_path = _searchable_pdf_path(filepath)
                with open(ocr_pdf_path, 'wb') as f:
                    f.write(pdf_bytes)
            except Exception as e:
                current_app.logger.warning('Searchable PDF generation failed: %s', e)
                ocr_pdf_path = None
        if not text.strip():
            text = 'No text detected in image. Please ensure the image contains readable text.'
        return {'text': text, 'file_type': 'image', 'confidence': confidence, 'ocr_pdf_path': ocr_pdf_path,
                'mean_confidence': mean_conf}
    except Exception as e:
        message = f'Error extracting text from image: {e}'
        if 'tessdata' in str(e) or 'traineddata' in str(e):
            message += f"\n\nError: The '{lang}' language pack might be missing. Please install it for Tesseract."
        return {'text': message, 'file_type': 'image (error)'}


def extract_document_text(filepath, lang='eng', engine='tesseract', progress=no_progress):
    """
    Extract text from a document on disk.

    Returns a dict with keys: text, file_type and optionally confidence
    (low-confidence words) and ocr_pdf_path (generated searchable PDF).
    progress(current, total, message) is called between units of work; it may
    raise to abort (see app.jobs.JobCancelled).
    """
    ext = os.path.splitext(filepath)[1].lower()
    if ext == '.pdf':
        return _extract_pdf(filepath, lang, progress)
    if ext in current_app.config['IMAGE_EXTENSIONS']:
        return _extract_image(filepath, lang, engine, progress)
    return {'text': f'Unsupported file type: {ext}\n\nSupported formats: PDF, PNG, JPG, JPEG, TIFF, BMP',
            'file_type': f'unsupported ({ext})', 'unsupported': True}
