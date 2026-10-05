"""
OCR operations as plain functions: (project_id, params, progress) -> result dict.

Both the synchronous API endpoints and the background job worker call these,
so a document is processed identically either way.
"""
import json
import os
from datetime import datetime

import pymupdf
import pytesseract
from flask import current_app
from PIL import Image

from .. import search_index
from ..db import get_config_value, transaction
from ..processors.advanced_ocr import AdvancedOCRProcessor
from ..processors.glm_ocr import GlmOcrProcessor
from ..processors.handwritten_to_pdf import HandwrittenToPDFConverter
from ..security import validate_language
from .ocr import RENDER_DPI, extract_document_text, no_progress
from .projects import get_project_data, set_status

STAT_KEYS = ('total_words', 'tables_found', 'checkboxes_found', 'text_fields_found', 'stamps_found', 'signatures_found')


class TaskError(Exception):
    """A task failed in a way the user should see; status is the HTTP code for sync calls."""

    def __init__(self, message, status=500):
        super().__init__(message)
        self.status = status


def _load_project_file(project_id):
    project = get_project_data(project_id)
    if not project:
        raise TaskError('Project not found', 404)
    filepath = project.get('filepath') or ''
    if not filepath or not os.path.exists(filepath):
        raise TaskError('File not found', 404)
    return project


def _save_ocr_result(project_id, text, confidence=None, ocr_pdf_path=None, mean_confidence=None):
    """mean_confidence is Tesseract's average word confidence (0-100), None when not measured."""
    with transaction() as conn:
        conn.execute('UPDATE ocr_text SET original_text = ?, confidence_data = ?, mean_confidence = ? '
                     'WHERE project_id = ?',
                     (text, json.dumps(confidence) if confidence else None, mean_confidence, project_id))
        if ocr_pdf_path:
            conn.execute('UPDATE files SET ocr_path = ? WHERE project_id = ?', (ocr_pdf_path, project_id))
        set_status(conn, project_id, 'cleanup')
        search_index.update(project_id, conn=conn)


def run_ocr(project_id, params, progress=no_progress):
    project = _load_project_file(project_id)
    lang = validate_language(params.get('language'))
    engine = get_config_value('ocr_engine', 'tesseract')

    result = extract_document_text(project['filepath'], lang, engine, progress)
    progress(1, 1, 'Saving results')
    _save_ocr_result(project_id, result['text'], result.get('confidence'), result.get('ocr_pdf_path'),
                     result.get('mean_confidence'))
    return {
        'success': True,
        'pages': 1,
        'text_length': len(result['text']),
        'message': 'OCR completed successfully',
        'file_type': result['file_type'],
    }


def _glm_text_and_tables(image_path):
    glm = GlmOcrProcessor()
    return glm.recognize_text(image_path), glm.recognize_table(image_path)


def _advanced_pdf(project_id, filepath, lang, engine, progress):
    stats = dict.fromkeys(STAT_KEYS, 0)
    pages = []
    upload_folder = current_app.config['UPLOAD_FOLDER']
    merged_searchable = pymupdf.open()
    has_pdf_pages = False
    with pymupdf.open(filepath) as doc:
        total = len(doc)
        for page_idx, page in enumerate(doc):
            progress(page_idx, total, f'Analysing page {page_idx + 1} of {total}')
            header = f'=== Page {page_idx + 1} ===\n\n'
            temp_path = os.path.join(upload_folder, f'temp_adv_{project_id}_page_{page_idx}.png')
            page.get_pixmap(dpi=RENDER_DPI).save(temp_path)
            try:
                # 1. Generate searchable PDF page (invisible text layer for search & select)
                try:
                    with Image.open(temp_path) as img:
                        page_pdf_bytes = pytesseract.image_to_pdf_or_hocr(img, extension='pdf', lang=lang)
                        with pymupdf.open('pdf', page_pdf_bytes) as single:
                            merged_searchable.insert_pdf(single)
                        has_pdf_pages = True
                except Exception as pdf_err:
                    current_app.logger.warning('Advanced OCR searchable page %s failed: %s', page_idx + 1, pdf_err)

                # 2. Extract structured layout and text
                if engine == 'glm-ocr':
                    text, tables = _glm_text_and_tables(temp_path)
                    page_text = header + text
                    if tables.strip():
                        page_text += '\n\n--- TABLES ---\n' + tables
                        stats['tables_found'] += 1
                    stats['total_words'] += len(text.split())
                    pages.append(page_text)
                    continue

                processor = AdvancedOCRProcessor()
                res = processor.process_document_with_layout(temp_path, lang)
                if res.get('success'):
                    pages.append(header + processor.generate_structured_output(res))
                    page_stats = res.get('statistics', {})
                    for key in STAT_KEYS:
                        stats[key] += int(page_stats.get(key, 0))
                else:
                    try:
                        with Image.open(temp_path) as img:
                            raw = pytesseract.image_to_string(img, lang=lang)
                        pages.append(header + raw)
                        stats['total_words'] += len(raw.split())
                    except Exception:
                        pages.append(header + '[No text extracted]')
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

    ocr_pdf_path = None
    if has_pdf_pages:
        stem = os.path.splitext(os.path.basename(filepath))[0]
        ocr_pdf_path = os.path.join(upload_folder, f'ocr_{stem}.pdf')
        merged_searchable.save(ocr_pdf_path, garbage=3, deflate=True)
    merged_searchable.close()

    progress(1, 1, 'Saving results')
    final_text = '\n\n'.join(pages) if pages else 'No text extracted from PDF.'
    _save_ocr_result(project_id, final_text, ocr_pdf_path=ocr_pdf_path)
    return {
        'success': True,
        'message': 'Advanced OCR completed for PDF successfully',
        'statistics': stats,
        'text_length': len(final_text),
        'total_pages': len(pages),
        'main_text': final_text,
        'orientation': {'corrected': False, 'rotation_angle': 0},
        'page_structure': {'has_header': False, 'has_footer': False,
                           'stamps_count': stats['stamps_found'], 'signatures_count': stats['signatures_found']},
        'tables_found': stats['tables_found'],
        'forms_found': {'checkboxes': stats['checkboxes_found'], 'text_fields': stats['text_fields_found']},
        'ocr_pdf_path': ocr_pdf_path,
    }


def run_advanced_ocr(project_id, params, progress=no_progress):
    """Advanced OCR with layout analysis, table detection and structure recognition."""
    project = _load_project_file(project_id)
    lang = validate_language(params.get('language'))
    engine = get_config_value('ocr_engine', 'tesseract')
    filepath = project['filepath']
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.pdf':
        try:
            return _advanced_pdf(project_id, filepath, lang, engine, progress)
        except Exception as e:
            current_app.logger.exception('Advanced PDF OCR failed')
            raise TaskError(f'PDF Advanced OCR failed: {e}') from e

    if ext not in current_app.config['IMAGE_EXTENSIONS']:
        raise TaskError(f'Unsupported file format: {ext}. Supported formats: PDF, PNG, JPG, JPEG, TIFF, BMP', 400)

    progress(0, 1, 'Analysing layout')
    if engine == 'glm-ocr':
        try:
            text, tables = _glm_text_and_tables(filepath)
        except Exception as e:
            current_app.logger.exception('GLM-OCR advanced failed')
            raise TaskError(f'GLM-OCR advanced error: {e}') from e
        extracted = text + ('\n\n--- TABLES ---\n' + tables if tables.strip() else '')
        _save_ocr_result(project_id, extracted)
        return {
            'success': True,
            'main_text': extracted,
            'text_length': len(extracted),
            'engine': 'glm-ocr',
            'statistics': {**dict.fromkeys(STAT_KEYS, 0),
                           'total_words': len(extracted.split()),
                           'tables_found': 1 if tables.strip() else 0},
        }

    processor = AdvancedOCRProcessor()
    result = processor.process_document_with_layout(filepath, lang)
    if not result.get('success'):
        raise TaskError(result.get('error', 'Advanced OCR processing failed'))

    progress(1, 1, 'Saving results')
    main_text = (result.get('main_text') or '').strip()
    clean_parts = []
    if main_text:
        clean_parts.append(main_text)
    for t in result.get('tables', []):
        t_text = (t.get('text') or '').strip()
        if t_text and t_text not in main_text:
            clean_parts.append(t_text)
    hw = (result.get('handwritten_text') or '').strip()
    if hw and hw not in main_text:
        clean_parts.append(hw)

    structured_text = '\n\n'.join(clean_parts) if clean_parts else processor.generate_structured_output(result)

    # Generate searchable PDF with selectable text for the image
    ocr_pdf_path = None
    try:
        with Image.open(filepath) as img:
            pdf_bytes = pytesseract.image_to_pdf_or_hocr(img, extension='pdf', lang=lang)
            stem = os.path.splitext(os.path.basename(filepath))[0]
            ocr_pdf_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f'ocr_{stem}.pdf')
            with open(ocr_pdf_path, 'wb') as f:
                f.write(pdf_bytes)
    except Exception as e:
        current_app.logger.warning('Failed to generate searchable PDF for image in advanced OCR: %s', e)

    _save_ocr_result(project_id, structured_text, ocr_pdf_path=ocr_pdf_path)

    stats = result.get('statistics', {})
    structure = result.get('page_structure', {})
    forms = result.get('forms', {})
    orientation = result.get('orientation', {})
    return {
        'success': True,
        'message': 'Advanced OCR completed successfully',
        'statistics': {key: int(stats.get(key, 0)) for key in STAT_KEYS},
        'orientation': {'corrected': bool(orientation.get('corrected', False)),
                        'rotation_angle': int(orientation.get('rotation_angle', 0))},
        'page_structure': {
            'has_header': bool(structure.get('header', {}).get('present', False)),
            'has_footer': bool(structure.get('footer', {}).get('present', False)),
            'stamps_count': len(structure.get('stamps', [])),
            'signatures_count': len(structure.get('signatures', [])),
        },
        'tables_found': len(result.get('tables', [])),
        'forms_found': {'checkboxes': len(forms.get('checkboxes', [])),
                        'text_fields': len(forms.get('text_fields', []))},
        'text_length': len(structured_text),
        'ocr_pdf_path': ocr_pdf_path,
        'pages': 1,
    }


def run_handwritten_to_pdf(project_id, params, progress=no_progress):
    project = _load_project_file(project_id)
    lang = validate_language(params.get('language'))
    title = str(params.get('title') or (project.get('metadata') or {}).get('title') or 'Handwritten Notes')[:300]
    filepath = project['filepath']
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in current_app.config['IMAGE_EXTENSIONS']:
        raise TaskError('Handwritten to PDF conversion only supports image files', 400)

    progress(0, 1, 'Recognising handwriting')
    output_filename = f"handwritten_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = os.path.join(current_app.config['UPLOAD_FOLDER'], output_filename)
    institution = get_config_value('institution_name', '')
    result = HandwrittenToPDFConverter().convert_handwritten_to_pdf(
        image_path=filepath,
        output_path=output_path,
        title=title,
        language=lang,
        metadata={
            'author': institution or f'Project {project_id}',
            'subject': f'Digitized Document: {title}',
            'creator': f'{institution} via LibraDigit AI' if institution else 'LibraDigit AI',
        },
    )
    if not result.get('success'):
        raise TaskError(result.get('error', 'Conversion failed'))

    progress(1, 1, 'Saving results')
    extracted = result.get('extracted_text', '')
    _save_ocr_result(project_id, extracted)
    return {
        'success': True,
        'message': 'Handwritten text converted to PDF successfully',
        'pdf_filename': output_filename,
        'word_count': int(result.get('word_count', 0)),
        'line_count': int(result.get('line_count', 0)),
        'text_length': len(extracted),
    }


TASKS = {
    'ocr': run_ocr,
    'advanced_ocr': run_advanced_ocr,
    'handwritten_to_pdf': run_handwritten_to_pdf,
}
