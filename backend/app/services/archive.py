"""
Builds the BagIt-style archive package for a finished project.

Layout: <archive root>/<Subject>/<Year>/<Name>/
            bagit.txt, bag-info.txt, dublin-core.xml,
            manifest-md5.txt, manifest-sha256.txt, tagmanifest-sha256.txt
            data/<Name>.pdf          (PDF/A-2b where conformance can be ensured)
"""
import hashlib
import os
import re
import shutil
from datetime import datetime

from flask import current_app
from PIL import Image

from ..db import get_config_value
from . import dublin_core
from .pdfa import convert_to_pdfa

_EMBEDDED_FONT = 'LibraDigitVera'


def sanitize_component(text, fallback):
    """Reduce text to a safe single path component."""
    text = re.sub(r'[^a-zA-Z0-9_-]', '', (text or '').replace(' ', '_'))
    text = re.sub(r'_+', '_', text).strip('_')
    return text[:100] or fallback


def get_archive_root():
    custom = get_config_value('archive_storage_path')
    if custom:
        try:
            os.makedirs(custom, exist_ok=True)
            return custom
        except OSError as e:
            current_app.logger.warning('Custom archive path unusable (%s); using default', e)
    return current_app.config['ARCHIVE_FOLDER']


def _embedded_font():
    """Register reportlab's bundled Vera TTF; PDF/A needs embedded fonts, not Helvetica."""
    import reportlab
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    if _EMBEDDED_FONT not in pdfmetrics.getRegisteredFontNames():
        font_path = os.path.join(os.path.dirname(reportlab.__file__), 'fonts', 'Vera.ttf')
        pdfmetrics.registerFont(TTFont(_EMBEDDED_FONT, font_path))
    return _EMBEDDED_FONT


def _placeholder_pdf(path, lines):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    c = canvas.Canvas(path, pagesize=letter, initialFontName=_embedded_font())
    y = 750
    for line in lines:
        c.drawString(100, y, line)
        y -= 20
    c.save()


def _materialize_pdf(source_path, final_path, labels, generated_source):
    """
    Copy or convert the best available source into final_path as a PDF.

    Returns True when the PDF was produced by LibraDigit (OCR output, an image
    conversion or a placeholder) rather than copied from a user's PDF.
    """
    if not source_path or not os.path.exists(source_path):
        _placeholder_pdf(final_path, [f'Archive file for: {labels["title"]}', f'Author: {labels["author"]}',
                                      f'Year: {labels["year"]}', f'Subject: {labels["subject"]}',
                                      'Note: Original file not found'])
        return True
    ext = os.path.splitext(source_path)[1].lower()
    if ext in current_app.config['IMAGE_EXTENSIONS']:
        try:
            with Image.open(source_path) as image:
                if image.mode not in ('RGB', 'L'):
                    image = image.convert('RGB')
                image.save(final_path, 'PDF', resolution=100.0)
        except Exception:
            current_app.logger.exception('Image to PDF conversion failed')
            _placeholder_pdf(final_path, [f'Error archiving file: {labels["title"]}',
                                          'Could not convert original image to PDF.'])
        return True
    shutil.copy2(source_path, final_path)
    return generated_source


def _make_archival_pdf(final_path, metadata, language, generated):
    """Convert final_path in place to PDF/A-2b (or a plain PDF with XMP metadata)."""
    temp_path = final_path + '.pdfa.pdf'
    try:
        result = convert_to_pdfa(final_path, temp_path, {
            'title': metadata.get('title'),
            'author': metadata.get('author'),
            'subject': metadata.get('subject'),
            'keywords': metadata.get('keywords'),
            'language': (dublin_core.bcp47_language(language) or [None])[0],
            'publisher': get_config_value('institution_name', ''),
        }, generated=generated)
        shutil.move(temp_path, final_path)
        return result.as_dict()
    except Exception as e:
        current_app.logger.exception('PDF/A conversion failed')
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {'conformance': 'PDF', 'pdfa': False, 'issues': [f'PDF/A conversion failed: {e}']}


def _digests(path):
    md5, sha256 = hashlib.md5(), hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            md5.update(chunk)
            sha256.update(chunk)
    return md5.hexdigest(), sha256.hexdigest()


def _sha256_text(path):
    return _digests(path)[1]


def _write_bag_files(archive_base, final_path, filename_pdf, labels, pdfa, dc_xml):
    institution = get_config_value('institution_name', '') or 'LibraDigit AI'
    with open(os.path.join(archive_base, 'dublin-core.xml'), 'w', encoding='utf-8') as f:
        f.write(dc_xml)
    with open(os.path.join(archive_base, 'bagit.txt'), 'w', encoding='utf-8') as f:
        f.write('BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n')
    with open(os.path.join(archive_base, 'bag-info.txt'), 'w', encoding='utf-8') as f:
        f.write(f'Source-Organization: {institution}\n')
        f.write(f'Contact-Name: {labels["author"]}\n')
        f.write(f'External-Description: {labels["title"]}\n')
        f.write(f'Bagging-Date: {datetime.now().strftime("%Y-%m-%d")}\n')
        f.write('Bag-Software-Agent: LibraDigit AI\n')
        f.write(f'Payload-Oxum: {os.path.getsize(final_path)}.1\n')
        f.write(f'Archival-Format: {pdfa["conformance"]}\n')
    md5, sha256 = _digests(final_path)
    with open(os.path.join(archive_base, 'manifest-md5.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{md5}  data/{filename_pdf}\n')
    with open(os.path.join(archive_base, 'manifest-sha256.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{sha256}  data/{filename_pdf}\n')
    # Tag manifest: lets validators detect changes to the metadata files too.
    tag_files = ('bagit.txt', 'bag-info.txt', 'dublin-core.xml', 'manifest-md5.txt', 'manifest-sha256.txt')
    with open(os.path.join(archive_base, 'tagmanifest-sha256.txt'), 'w', encoding='utf-8') as f:
        for name in tag_files:
            f.write(f'{_sha256_text(os.path.join(archive_base, name))}  {name}\n')


def build_archive(project, file_row, language=None):
    """
    Create the archive package.

    Returns {'final_path': ..., 'pdfa': {'conformance', 'pdfa', 'issues'}}.
    """
    metadata = project.get('metadata') or {}
    labels = {
        'subject': sanitize_component(metadata.get('subject'), 'General'),
        'year': sanitize_component(metadata.get('year'), 'Unknown'),
        'author': sanitize_component(metadata.get('author'), ''),
        'title': sanitize_component(metadata.get('title'), 'Untitled'),
    }
    name_parts = [p for p in (labels['author'], labels['year'] if metadata.get('year') else '', labels['title']) if p]
    project_name = '_'.join(name_parts)
    filename_pdf = project_name + '.pdf'

    archive_base = os.path.join(get_archive_root(), labels['subject'], labels['year'], project_name)
    data_dir = os.path.join(archive_base, 'data')
    os.makedirs(data_dir, exist_ok=True)
    final_path = os.path.join(data_dir, filename_pdf)

    # Priority: searchable OCR PDF (generated by us) > cleaned PDF > original upload.
    source_path, generated_source = None, False
    if file_row:
        for key in ('ocr_path', 'cleaned_path', 'original_path'):
            if file_row[key] and os.path.exists(file_row[key]):
                source_path, generated_source = file_row[key], key == 'ocr_path'
                break

    generated = _materialize_pdf(source_path, final_path, labels, generated_source)
    pdfa = _make_archival_pdf(final_path, metadata, language, generated)

    record = dublin_core.build_record(project, get_config_value('institution_name', ''), language, filename_pdf)
    try:
        _write_bag_files(archive_base, final_path, filename_pdf, labels, pdfa, dublin_core.to_xml(record))
    except OSError as e:
        current_app.logger.warning('Failed to write BagIt files: %s', e)
    return {'final_path': final_path, 'pdfa': pdfa}
