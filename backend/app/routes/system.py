"""
Search, settings, analytics and health endpoints.
"""
import os
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request

from ..db import get_config_value, set_config_value, transaction
from ..processors.glm_ocr import check_ollama_status
from ..search_index import build_fts_query
from ..security import ValidationError, validate_language
from ..services.archive import get_archive_root
from ..services.ocr import tesseract_available

bp = Blueprint('system', __name__)

OCR_ENGINES = ('tesseract', 'glm-ocr')
PDF_QUALITIES = ('max', 'high', 'balanced', 'web')
MAX_SETTING_LENGTH = 500


@bp.get('/')
def home():
    return jsonify({
        'name': 'LibraDigit AI Backend API',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'projects': '/api/projects',
            'ocr': '/api/ocr/<project_id>',
            'cleanup': '/api/cleanup/<project_id>',
            'metadata': '/api/metadata/<project_id>',
            'archive': '/api/archive/<project_id>',
        },
    })


@bp.get('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'database': os.path.exists(current_app.config['DATABASE']),
        'tesseract': tesseract_available(),
    })


@bp.get('/api/search')
def search_archives():
    """Full-text search with optional exact/prefix matching, field and year filters."""
    args = request.args
    query = args.get('q', '').strip()
    try:
        limit = int(args.get('limit', 20))
    except ValueError:
        limit = 20
    limit = max(1, min(limit, current_app.config['SEARCH_MAX_LIMIT']))
    year_start = args.get('year_start', '')
    year_end = args.get('year_end', '')

    fts_query = build_fts_query(
        query,
        exact=args.get('exact', 'false').lower() == 'true',
        prefix=args.get('smart', 'false').lower() == 'true',
        field=args.get('field', 'all'),
    )
    if not fts_query and not (year_start.isdigit() or year_end.isdigit()):
        return jsonify({'results': [], 'count': 0})

    where, params = [], []
    if fts_query:
        where.append('search_index MATCH ?')
        params.append(fts_query)
    if year_start.isdigit():
        where.append('CAST(m.year AS INTEGER) >= ?')
        params.append(int(year_start))
    if year_end.isdigit():
        where.append('CAST(m.year AS INTEGER) <= ?')
        params.append(int(year_end))

    # snippet() is only valid together with MATCH.
    snippet = "snippet(search_index, 3, '<mark>', '</mark>', '...', 32)" if fts_query else 'substr(s.content, 1, 200)'
    order = 'ORDER BY rank' if fts_query else 'ORDER BY s.rowid DESC'
    sql = f'''
        SELECT s.project_id, s.title, s.author, {snippet} AS snippet, m.subject, m.year
        FROM search_index s
        LEFT JOIN metadata m ON CAST(s.project_id AS INTEGER) = m.project_id
        WHERE {' AND '.join(where)}
        {order}
        LIMIT ?
    '''
    params.append(limit)

    with transaction() as conn:
        rows = conn.execute(sql, params).fetchall()

    results = [{
        'id': int(row['project_id']),
        'title': row['title'] or 'Untitled Document',
        'author': row['author'] or 'Unknown',
        'snippet': row['snippet'] or '',
        'subject': row['subject'] or 'General',
        'year': row['year'] or 'N/A',
    } for row in rows]
    return jsonify({'results': results, 'count': len(results), 'query': query})


@bp.get('/api/settings')
def get_settings():
    return jsonify({
        'archive_storage_path': get_config_value('archive_storage_path', current_app.config['ARCHIVE_FOLDER']),
        'export_as_zip': get_config_value('export_as_zip', 'false') == 'true',
        'date_format': get_config_value('date_format', 'YYYY-MM-DD'),
        'institution_name': get_config_value('institution_name', ''),
        'file_naming_convention': get_config_value('file_naming_convention', '{title}_{year}'),
        'default_ocr_language': get_config_value('default_ocr_language', 'eng'),
        'pdf_quality': get_config_value('pdf_quality', 'high'),
        'ocr_engine': get_config_value('ocr_engine', 'tesseract'),
    })


def _setting_str(value, name):
    value = '' if value is None else str(value)
    if len(value) > MAX_SETTING_LENGTH or '\n' in value:
        raise ValidationError(f'Invalid value for {name}')
    return value


@bp.post('/api/settings')
def update_settings():
    data = request.get_json(silent=True) or {}

    if 'archive_storage_path' in data:
        path = _setting_str(data['archive_storage_path'], 'archive_storage_path').strip()
        if path:
            if not os.path.isabs(path):
                return jsonify({'error': 'Archive path must be an absolute path'}), 400
            try:
                os.makedirs(path, exist_ok=True)
            except OSError as e:
                return jsonify({'error': f'Path is invalid or not writable: {e}'}), 400
        set_config_value('archive_storage_path', path)

    if 'export_as_zip' in data:
        set_config_value('export_as_zip', str(bool(data['export_as_zip'])).lower())
    if 'ocr_engine' in data:
        if data['ocr_engine'] not in OCR_ENGINES:
            return jsonify({'error': f"Unknown OCR engine: {data['ocr_engine']}"}), 400
        set_config_value('ocr_engine', data['ocr_engine'])
    if 'pdf_quality' in data:
        if data['pdf_quality'] not in PDF_QUALITIES:
            return jsonify({'error': 'Invalid PDF quality'}), 400
        set_config_value('pdf_quality', data['pdf_quality'])
    if 'default_ocr_language' in data:
        set_config_value('default_ocr_language', validate_language(data['default_ocr_language']))
    for key in ('date_format', 'institution_name', 'file_naming_convention'):
        if key in data:
            set_config_value(key, _setting_str(data[key], key))

    return jsonify({'message': 'Settings updated successfully', 'settings': data})


@bp.get('/api/glmocr/status')
def glmocr_status():
    try:
        return jsonify(check_ollama_status())
    except Exception as e:
        return jsonify({'available': False, 'model_pulled': False, 'error': str(e)}), 500


def _tree_size(path):
    total = count = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
                count += 1
            except OSError:
                pass
    return total, count


@bp.get('/api/analytics')
def get_analytics():
    with transaction() as conn:
        status_counts = dict(conn.execute('SELECT status, COUNT(*) FROM projects GROUP BY status').fetchall())
        subjects = conn.execute('''
            SELECT subject, COUNT(*) FROM metadata GROUP BY subject ORDER BY COUNT(*) DESC LIMIT 10
        ''').fetchall()
        daily = dict(conn.execute('''
            SELECT date(created_at) AS day, COUNT(*) FROM projects
            WHERE created_at >= date('now', '-6 days') GROUP BY day
        ''').fetchall())

    distribution = [{'name': label, 'value': status_counts.get(key, 0)} for key, label in (
        ('upload', 'Upload'), ('ocr', 'OCR'), ('cleanup', 'Cleanup'), ('metadata', 'Metadata'), ('archived', 'Archived'))]

    upload_size, upload_count = _tree_size(current_app.config['UPLOAD_FOLDER'])
    archive_size, archive_count = _tree_size(get_archive_root())
    total_bytes = upload_size + archive_size

    # created_at is stored in UTC by SQLite's CURRENT_TIMESTAMP.
    today = datetime.utcnow().date()
    timeline = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        timeline.append({'day': day.strftime('%a'), 'date': day.isoformat(), 'count': daily.get(day.isoformat(), 0)})

    return jsonify({
        'status_distribution': distribution,
        'total_projects': sum(item['value'] for item in distribution),
        'storage_usage': {
            'total_bytes': total_bytes,
            'total_files': upload_count + archive_count,
            'formatted': f'{total_bytes / (1024 * 1024):.2f} MB',
        },
        'subjects': [{'name': row[0], 'value': row[1]} for row in subjects],
        'timeline': timeline,
    })
