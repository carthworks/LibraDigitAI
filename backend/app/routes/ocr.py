import json
import os
from datetime import datetime

import pymupdf
import pytesseract
from flask import Blueprint, current_app, jsonify, request
from PIL import Image

from .. import search_index
from ..db import get_config_value, transaction
from ..processors.advanced_ocr import AdvancedOCRProcessor
from ..processors.glm_ocr import GlmOcrProcessor
from ..processors.handwritten_to_pdf import HandwrittenToPDFConverter
from ..security import validate_language
from ..services.ocr import RENDER_DPI, extract_document_text
from ..services.projects import get_project_data, set_status

bp = Blueprint('ocr', __name__, url_prefix='/api')

STAT_KEYS = ('total_words', 'tables_found', 'checkboxes_found', 'text_fields_found', 'stamps_found', 'signatures_found')


def _load_project_file(project_id):
    """Return (project, filepath) or a Flask error response tuple."""
    project = get_project_data(project_id)
    if not project:
        return None, (jsonify({'error': 'Project not found'}), 404)
    filepath = project.get('filepath') or ''
    if not filepath or not os.path.exists(filepath):
        return project, (jsonify({'error': 'File not found'}), 404)
    return project, None


def _save_ocr_result(project_id, text, confidence=None, ocr_pdf_path=None):
    with transaction() as conn:
        conn.execute('UPDATE ocr_text SET original_text = ?, confidence_data = ? WHERE project_id = ?',
                     (text, json.dumps(confidence) if confidence else None, project_id))
        if ocr_pdf_path:
            conn.execute('UPDATE files SET ocr_path = ? WHERE project_id = ?', (ocr_pdf_path, project_id))
        set_status(conn, project_id, 'cleanup')
        search_index.update(project_id, conn=conn)


@bp.post('/ocr/<int:project_id>')
def run_ocr(project_id):
    project, error = _load_project_file(project_id)
    if error:
        return error

    req = request.get_json(silent=True) or {}
    lang = validate_language(req.get('language'))
    engine = get_config_value('ocr_engine', 'tesseract')

    result = extract_document_text(project['filepath'], lang, engine)
    _save_ocr_result(project_id, result['text'], result.get('confidence'), result.get('ocr_pdf_path'))

    return jsonify({
        'success': True,
        'pages': 1,
        'text_length': len(result['text']),
        'message': 'OCR completed successfully',
        'file_type': result['file_type'],
    })


def _glm_text_and_tables(image_path):
    glm = GlmOcrProcessor()
    text = glm.recognize_text(image_path)
    tables = glm.recognize_table(image_path)
    return text, tables


def _advanced_pdf(project_id, filepath, lang, engine):
    stats = dict.fromkeys(STAT_KEYS, 0)
    pages = []
    upload_folder = current_app.config['UPLOAD_FOLDER']
    with pymupdf.open(filepath) as doc:
        for page_idx, page in enumerate(doc):
            header = f'=== Page {page_idx + 1} ===\n\n'
            temp_path = os.path.join(upload_folder, f'temp_adv_{project_id}_page_{page_idx}.png')
            page.get_pixmap(dpi=RENDER_DPI).save(temp_path)
            try:
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

    final_text = '\n\n'.join(pages) if pages else 'No text extracted from PDF.'
    _save_ocr_result(project_id, final_text)
    return jsonify({
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
    })


@bp.post('/ocr/advanced/<int:project_id>')
def run_advanced_ocr(project_id):
    """Advanced OCR with layout analysis, table detection and structure recognition."""
    project, error = _load_project_file(project_id)
    if error:
        return error

    req = request.get_json(silent=True) or {}
    lang = validate_language(req.get('language'))
    engine = get_config_value('ocr_engine', 'tesseract')
    filepath = project['filepath']
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.pdf':
        try:
            return _advanced_pdf(project_id, filepath, lang, engine)
        except Exception as e:
            current_app.logger.exception('Advanced PDF OCR failed')
            return jsonify({'error': f'PDF Advanced OCR failed: {e}', 'success': False}), 500

    if ext not in current_app.config['IMAGE_EXTENSIONS']:
        return jsonify({
            'error': f'Unsupported file format: {ext}. Supported formats: PDF, PNG, JPG, JPEG, TIFF, BMP',
            'file_type': ext,
        }), 400

    if engine == 'glm-ocr':
        try:
            text, tables = _glm_text_and_tables(filepath)
        except Exception as e:
            current_app.logger.exception('GLM-OCR advanced failed')
            return jsonify({'error': f'GLM-OCR advanced error: {e}', 'success': False}), 500
        extracted = text + ('\n\n--- TABLES ---\n' + tables if tables.strip() else '')
        _save_ocr_result(project_id, extracted)
        return jsonify({
            'success': True,
            'main_text': extracted,
            'text_length': len(extracted),
            'engine': 'glm-ocr',
            'statistics': {**dict.fromkeys(STAT_KEYS, 0),
                           'total_words': len(extracted.split()),
                           'tables_found': 1 if tables.strip() else 0},
        })

    processor = AdvancedOCRProcessor()
    result = processor.process_document_with_layout(filepath, lang)
    if not result.get('success'):
        return jsonify({'error': result.get('error', 'Advanced OCR processing failed'), 'success': False}), 500

    structured_text = processor.generate_structured_output(result)
    _save_ocr_result(project_id, structured_text)

    stats = result.get('statistics', {})
    structure = result.get('page_structure', {})
    forms = result.get('forms', {})
    orientation = result.get('orientation', {})
    return jsonify({
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
        'pages': 1,
    })


@bp.post('/handwritten-to-pdf/<int:project_id>')
def convert_handwritten_to_pdf(project_id):
    project, error = _load_project_file(project_id)
    if error:
        return error

    req = request.get_json(silent=True) or {}
    lang = validate_language(req.get('language'))
    title = str(req.get('title') or (project.get('metadata') or {}).get('title') or 'Handwritten Notes')[:300]
    filepath = project['filepath']
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in current_app.config['IMAGE_EXTENSIONS']:
        return jsonify({'error': 'Handwritten to PDF conversion only supports image files', 'file_type': ext}), 400

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
        return jsonify({'error': result.get('error', 'Conversion failed'), 'success': False}), 500

    extracted = result.get('extracted_text', '')
    _save_ocr_result(project_id, extracted)
    return jsonify({
        'success': True,
        'message': 'Handwritten text converted to PDF successfully',
        'pdf_filename': output_filename,
        'word_count': int(result.get('word_count', 0)),
        'line_count': int(result.get('line_count', 0)),
        'text_length': len(extracted),
    })
