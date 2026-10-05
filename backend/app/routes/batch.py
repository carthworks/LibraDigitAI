from datetime import datetime

from flask import Blueprint, current_app, jsonify, request

from .. import search_index
from ..db import get_config_value, transaction
from ..processors.batch_processor import BatchProcessor
from ..security import ValidationError, display_filename, safe_upload_path
from ..services.ocr import extract_document_text
from ..services.projects import create_project, get_project_data, set_status

bp = Blueprint('batch', __name__, url_prefix='/api/batch')

MAX_BULK_PROJECTS = 1000


def get_batch_processor():
    """One BatchProcessor per app; it holds in-memory progress for running batches."""
    ext = current_app.extensions
    if 'batch_processor' not in ext:
        ext['batch_processor'] = BatchProcessor(current_app.config['DATABASE'], current_app.config['UPLOAD_FOLDER'])
    return ext['batch_processor']


@bp.post('/create')
def create_batch():
    uploads = [f for f in request.files.getlist('files') if f.filename]
    if not uploads:
        return jsonify({'error': 'No files provided'}), 400

    allowed = current_app.config['ALLOWED_UPLOAD_EXTENSIONS']
    accepted, skipped = [], []
    for upload in uploads:
        name = display_filename(upload.filename)
        ext = ('.' + name.rsplit('.', 1)[-1].lower()) if '.' in name else ''
        (accepted if ext in allowed else skipped).append(upload)
    if not accepted:
        return jsonify({'error': 'No supported files provided',
                        'skipped': [display_filename(f.filename) for f in skipped]}), 400

    batch_name = (request.form.get('batch_name') or f'Batch {datetime.now():%Y-%m-%d %H:%M}')[:200]
    processor = get_batch_processor()
    batch_id = processor.create_batch_job(batch_name, len(accepted))

    project_ids = []
    for upload in accepted:
        filepath = safe_upload_path(upload.filename)
        upload.save(filepath)
        with transaction() as conn:
            project_id = create_project(conn, display_filename(upload.filename), filepath)
        processor.add_batch_item(batch_id, project_id)
        project_ids.append(project_id)

    return jsonify({
        'success': True,
        'batch_id': batch_id,
        'batch_name': batch_name,
        'files_uploaded': len(project_ids),
        'project_ids': project_ids,
        'skipped': [display_filename(f.filename) for f in skipped],
    })


@bp.post('/<int:batch_id>/start')
def start_batch_processing(batch_id):
    processor = get_batch_processor()
    if processor.is_cancelled(batch_id):
        return jsonify({'error': 'Batch not found or cancelled'}), 409
    app = current_app._get_current_object()
    lang = get_config_value('default_ocr_language', 'eng')
    engine = get_config_value('ocr_engine', 'tesseract')

    def ocr_callback(project_id):
        # Runs on the worker thread, outside any request.
        with app.app_context():
            project = get_project_data(project_id)
            if not project:
                return False, 'Project not found'
            filepath = project.get('filepath') or ''
            result = extract_document_text(filepath, lang, engine)
            if result.get('unsupported'):
                return False, result['text']
            with transaction() as conn:
                conn.execute('UPDATE ocr_text SET original_text = ? WHERE project_id = ?', (result['text'], project_id))
                if result.get('ocr_pdf_path'):
                    conn.execute('UPDATE files SET ocr_path = ? WHERE project_id = ?',
                                 (result['ocr_pdf_path'], project_id))
                set_status(conn, project_id, 'cleanup')
                search_index.update(project_id, conn=conn)
            return True, None

    if not processor.start_batch_processing_async(batch_id, ocr_callback):
        return jsonify({'error': 'Batch is already processing'}), 409
    return jsonify({'success': True, 'message': 'Batch processing started'})


@bp.get('/<int:batch_id>/status')
def get_batch_status(batch_id):
    status = get_batch_processor().get_batch_status(batch_id)
    if not status:
        return jsonify({'error': 'Batch not found'}), 404
    return jsonify(status)


@bp.post('/<int:batch_id>/cancel')
def cancel_batch(batch_id):
    success = get_batch_processor().cancel_batch(batch_id)
    return jsonify({'success': success, 'message': 'Batch cancelled'})


@bp.get('/list')
def list_batches():
    limit = max(1, min(request.args.get('limit', 50, type=int) or 50, 500))
    return jsonify({'batches': get_batch_processor().get_all_batches(limit)})


@bp.delete('/<int:batch_id>')
def delete_batch(batch_id):
    success = get_batch_processor().delete_batch(batch_id)
    return jsonify({'success': success, 'message': 'Batch deleted'})


@bp.post('/bulk-metadata')
def apply_bulk_metadata():
    """Update metadata for many projects at once, with optional title prefix/suffix."""
    data = request.get_json(silent=True) or {}
    project_ids = data.get('project_ids') or []
    metadata = data.get('metadata') or {}
    title_mods = data.get('title_modifications') or {}

    if not project_ids:
        return jsonify({'error': 'No projects selected'}), 400
    if not isinstance(project_ids, list) or len(project_ids) > MAX_BULK_PROJECTS:
        raise ValidationError('project_ids must be a list of at most 1000 ids')
    try:
        project_ids = [int(pid) for pid in project_ids]
    except (TypeError, ValueError):
        raise ValidationError('project_ids must be integers')
    year = metadata.get('year')
    if year not in (None, '') and not str(year).isdigit():
        return jsonify({'error': 'Year must be numeric'}), 400

    prefix = str(title_mods.get('prefix') or '')
    suffix = str(title_mods.get('suffix') or '')
    optional = {k: metadata.get(k) for k in ('author', 'year', 'subject', 'keywords')}

    updated = 0
    with transaction() as conn:
        for pid in project_ids:
            row = conn.execute('''
                SELECT p.filename, m.id AS metadata_id, m.title
                FROM projects p LEFT JOIN metadata m ON p.id = m.project_id
                WHERE p.id = ?''', (pid,)).fetchone()
            if not row:
                continue
            current_title = row['title'] or row['filename']
            new_title = metadata.get('title') or current_title
            if prefix or suffix:
                new_title = f'{prefix}{new_title}{suffix}'

            if row['metadata_id'] is not None:
                fields = {k: v for k, v in optional.items() if v is not None}
                if new_title != current_title or metadata.get('title'):
                    fields['title'] = new_title
                if fields:
                    assignments = ', '.join(f'{k} = ?' for k in fields)  # keys are from a fixed list
                    conn.execute(f'UPDATE metadata SET {assignments} WHERE project_id = ?',
                                 (*fields.values(), pid))
                    updated += 1
            else:
                conn.execute('''
                    INSERT INTO metadata (project_id, title, author, year, subject, keywords)
                    VALUES (?, ?, ?, ?, ?, ?)''', (
                    pid, new_title,
                    optional['author'] if optional['author'] is not None else '',
                    optional['year'] if optional['year'] is not None else '',
                    optional['subject'] if optional['subject'] is not None else 'General',
                    optional['keywords'] if optional['keywords'] is not None else '',
                ))
                updated += 1
            set_status(conn, pid, 'archived')
            search_index.update(pid, conn=conn)

    return jsonify({'success': True, 'updated_count': updated,
                    'message': f'Updated metadata for {updated} projects'})
