"""
Post-OCR workflow: text cleanup, metadata, AI suggestions, archiving, translation.
"""
import json
import os

from deep_translator import GoogleTranslator
from flask import Blueprint, current_app, jsonify, request

from .. import search_index
from ..db import transaction
from ..processors.metadata_extractor import extract_metadata
from ..security import ValidationError
from ..services.archive import build_archive
from ..services.projects import get_project_data, set_status

bp = Blueprint('documents', __name__, url_prefix='/api')

METADATA_FIELDS = ('title', 'author', 'year', 'subject', 'keywords')
MAX_FIELD_LENGTH = 2000


def _text_field(data, key, required=False):
    value = data.get(key, '')
    if value is None:
        value = ''
    if not isinstance(value, str):
        value = str(value)
    value = value.strip()
    if required and not value:
        raise ValidationError(f'{key.capitalize()} is mandatory')
    if len(value) > MAX_FIELD_LENGTH:
        raise ValidationError(f'{key.capitalize()} is too long')
    return value


@bp.post('/cleanup/<int:project_id>')
def save_cleaned_text(project_id):
    data = request.get_json(silent=True) or {}
    cleaned_text = data.get('cleaned_text', '')
    if not isinstance(cleaned_text, str) or not cleaned_text.strip():
        return jsonify({'error': 'Text cannot be empty'}), 400

    with transaction() as conn:
        conn.execute('UPDATE ocr_text SET cleaned_text = ? WHERE project_id = ?', (cleaned_text, project_id))
        set_status(conn, project_id, 'metadata')
        search_index.update(project_id, conn=conn)
    return jsonify({'success': True})


@bp.post('/metadata/<int:project_id>')
def save_metadata(project_id):
    data = request.get_json(silent=True) or {}
    title = _text_field(data, 'title', required=True)
    author = _text_field(data, 'author')
    year = _text_field(data, 'year')
    subject = _text_field(data, 'subject')
    keywords = _text_field(data, 'keywords')
    if year and not year.isdigit():
        return jsonify({'error': 'Year must be numeric'}), 400

    with transaction() as conn:
        exists = conn.execute('SELECT 1 FROM metadata WHERE project_id = ?', (project_id,)).fetchone()
        if exists:
            conn.execute('UPDATE metadata SET title = ?, author = ?, year = ?, subject = ?, keywords = ? '
                         'WHERE project_id = ?', (title, author, year, subject, keywords, project_id))
        else:
            conn.execute('INSERT INTO metadata (project_id, title, author, year, subject, keywords) '
                         'VALUES (?, ?, ?, ?, ?, ?)', (project_id, title, author, year, subject, keywords))
        set_status(conn, project_id, 'archived')
        search_index.update(project_id, conn=conn)
    return jsonify({'success': True})


@bp.post('/metadata/extract/<int:project_id>')
def extract_metadata_suggestions(project_id):
    project = get_project_data(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    ocr_text = project.get('ocr_text') or ''
    if not ocr_text:
        return jsonify({'error': 'No OCR text available. Please run OCR first.'}), 400

    suggestions = extract_metadata(ocr_text, project.get('filename', ''))
    values = (suggestions['title'], suggestions['author'], suggestions['year'], suggestions['subject'],
              suggestions['keywords'], json.dumps(suggestions['confidence_scores']))

    with transaction() as conn:
        exists = conn.execute('SELECT 1 FROM metadata_suggestions WHERE project_id = ?', (project_id,)).fetchone()
        if exists:
            conn.execute('''
                UPDATE metadata_suggestions
                SET suggested_title = ?, suggested_author = ?, suggested_year = ?,
                    suggested_subject = ?, suggested_keywords = ?, confidence_scores = ?
                WHERE project_id = ?''', values + (project_id,))
        else:
            conn.execute('''
                INSERT INTO metadata_suggestions
                (suggested_title, suggested_author, suggested_year, suggested_subject,
                 suggested_keywords, confidence_scores, project_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)''', values + (project_id,))
    return jsonify({'success': True, 'suggestions': suggestions})


@bp.get('/metadata/suggestions/<int:project_id>')
def get_metadata_suggestions(project_id):
    with transaction() as conn:
        row = conn.execute('SELECT * FROM metadata_suggestions WHERE project_id = ?', (project_id,)).fetchone()
    if not row:
        return jsonify({'suggestions': None})
    suggestions = dict(row)
    if suggestions.get('confidence_scores'):
        suggestions['confidence_scores'] = json.loads(suggestions['confidence_scores'])
    return jsonify({'suggestions': suggestions})


@bp.post('/archive/<int:project_id>')
def generate_archive(project_id):
    project = get_project_data(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    with transaction() as conn:
        file_row = conn.execute('SELECT cleaned_path, original_path, ocr_path FROM files WHERE project_id = ?',
                                (project_id,)).fetchone()
    final_path = build_archive(project, file_row)

    with transaction() as conn:
        conn.execute('UPDATE files SET final_path = ? WHERE project_id = ?', (final_path, project_id))
        set_status(conn, project_id, 'archived')
    return jsonify({
        'success': True,
        'archive_path': final_path,
        'file_size': os.path.getsize(final_path) if os.path.exists(final_path) else 0,
    })


TRANSLATE_CHUNK_CHARS = 4500  # Google Translate rejects requests over 5000 chars


def _chunks(text, size=TRANSLATE_CHUNK_CHARS):
    """Split on paragraph boundaries into pieces no longer than size."""
    current = ''
    for para in text.split('\n\n'):
        while len(para) > size:
            if current:
                yield current
                current = ''
            yield para[:size]
            para = para[size:]
        if current and len(current) + 2 + len(para) > size:
            yield current
            current = para
        else:
            current = f'{current}\n\n{para}' if current else para
    if current.strip():
        yield current


@bp.post('/translate')
def translate_text():
    if not current_app.config['TRANSLATION_ENABLED']:
        return jsonify({'error': 'Translation is disabled on this installation'}), 403
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    if not isinstance(text, str) or not text.strip():
        return jsonify({'error': 'No text provided'}), 400
    if len(text) > current_app.config['MAX_TRANSLATE_CHARS']:
        return jsonify({'error': f"Text exceeds {current_app.config['MAX_TRANSLATE_CHARS']} characters"}), 400
    translator = GoogleTranslator(source=str(data.get('source', 'auto')), target=str(data.get('target', 'en')))
    translated = '\n\n'.join(translator.translate(chunk) or '' for chunk in _chunks(text))
    return jsonify({'translated_text': translated})
