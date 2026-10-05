import os

from flask import Blueprint, current_app, jsonify, request, send_file

from ..db import transaction
from ..security import ValidationError, display_filename, is_within, safe_upload_path
from ..services.archive import get_archive_root
from ..services.projects import create_project as insert_project
from ..services.projects import delete_project as remove_project
from ..services.projects import get_project_data, set_status

bp = Blueprint('projects', __name__, url_prefix='/api/projects')

VALID_STATUSES = ('upload', 'ocr', 'cleanup', 'metadata', 'archived')


def _servable_roots():
    cfg = current_app.config
    return (cfg['UPLOAD_FOLDER'], cfg['ARCHIVE_FOLDER'], get_archive_root())


def _first_existing(*paths):
    for path in paths:
        if path and os.path.exists(path):
            return path
    return None


@bp.get('')
def list_projects():
    with transaction() as conn:
        rows = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    return jsonify({'projects': [dict(r) for r in rows]})


@bp.post('')
def create_project():
    """Create a project from an uploaded file (multipart field 'file')."""
    upload = request.files.get('file')
    if upload is None:
        # Legacy JSON form: record only. A client-supplied filepath is never
        # trusted, otherwise any file on disk could be read back via /file.
        data = request.get_json(silent=True) or {}
        filename = data.get('filename')
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
        with transaction() as conn:
            project_id = insert_project(conn, display_filename(filename), '')
        return jsonify({'project': get_project_data(project_id)})

    if not upload.filename:
        return jsonify({'error': 'No file selected'}), 400

    filepath = safe_upload_path(upload.filename)
    upload.save(filepath)
    with transaction() as conn:
        project_id = insert_project(conn, display_filename(upload.filename), filepath)
    return jsonify({'project': get_project_data(project_id)})


@bp.get('/ebooks')
def list_ebooks():
    """List all converted/digitized e-books with complete metadata and file information."""
    with transaction() as conn:
        rows = conn.execute('''
            SELECT
                p.id,
                p.filename,
                p.filepath,
                p.status,
                p.created_at,
                p.updated_at,
                m.title,
                m.author,
                m.year,
                m.subject,
                m.keywords,
                f.original_path,
                f.ocr_path,
                f.cleaned_path,
                f.final_path,
                LENGTH(COALESCE(o.cleaned_text, o.original_text, '')) AS text_length,
                o.original_text,
                o.cleaned_text
            FROM projects p
            LEFT JOIN metadata m ON p.id = m.project_id
            LEFT JOIN files f ON p.id = f.project_id
            LEFT JOIN ocr_text o ON p.id = o.project_id
            ORDER BY p.created_at DESC
        ''').fetchall()

    ebooks = []
    for r in rows:
        d = dict(r)
        final_path = d.get('final_path')
        ocr_path = d.get('ocr_path')
        original_path = d.get('original_path')

        target_file = None
        for p in (final_path, ocr_path, original_path):
            if p and os.path.exists(p):
                target_file = p
                break

        file_size = os.path.getsize(target_file) if target_file else 0
        has_searchable_pdf = bool(ocr_path and os.path.exists(ocr_path))
        has_final_pdf = bool(final_path and os.path.exists(final_path))

        cleaned = d.get('cleaned_text') or d.get('original_text') or ''
        word_count = len(cleaned.split()) if cleaned else 0
        snippet = (cleaned[:300] + '...') if len(cleaned) > 300 else cleaned

        del d['original_text']
        del d['cleaned_text']

        d['file_size'] = file_size
        d['word_count'] = word_count
        d['snippet'] = snippet
        d['has_searchable_pdf'] = has_searchable_pdf
        d['has_final_pdf'] = has_final_pdf
        d['has_pdf'] = bool((target_file and target_file.lower().endswith('.pdf')) or has_searchable_pdf or has_final_pdf)
        d['display_title'] = d.get('title') or os.path.splitext(d['filename'])[0]
        ebooks.append(d)

    return jsonify({'ebooks': ebooks, 'total': len(ebooks)})


@bp.get('/<int:project_id>')
def get_project(project_id):
    project = get_project_data(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify({'project': project})


@bp.get('/<int:project_id>/file')
def get_project_file(project_id):
    """Serve the project file, preferring the archived/searchable PDF."""
    project = get_project_data(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    files = project.get('files') or {}
    original, ocr, final = files.get('original_path'), files.get('ocr_path'), files.get('final_path')
    req_type = request.args.get('type')

    file_path = None
    if req_type == 'original':
        file_path = _first_existing(original)
    elif req_type == 'pdf':
        file_path = _first_existing(final, ocr, original if (original or '').lower().endswith('.pdf') else None)
    file_path = file_path or _first_existing(final, ocr, original)

    if not file_path or not is_within(file_path, *_servable_roots()):
        return jsonify({'error': 'File not found'}), 404

    mimetype = 'application/pdf' if file_path.lower().endswith('.pdf') else None
    return send_file(file_path, mimetype=mimetype, as_attachment=False)


@bp.get('/<int:project_id>/searchable_pdf')
def download_searchable_pdf(project_id):
    """Download the auto-generated searchable (sandwich) PDF."""
    project = get_project_data(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    ocr_path = (project.get('files') or {}).get('ocr_path')
    if not ocr_path or not os.path.exists(ocr_path) or not is_within(ocr_path, current_app.config['UPLOAD_FOLDER']):
        return jsonify({'error': 'Searchable PDF not generated yet. Please Run OCR.'}), 404
    stem = os.path.splitext(project['filename'])[0]
    return send_file(ocr_path, as_attachment=True, download_name=f'Searchable_{stem}.pdf')


@bp.put('/<int:project_id>/status')
def update_project_status(project_id):
    status = (request.get_json(silent=True) or {}).get('status')
    if status not in VALID_STATUSES:
        raise ValidationError(f'Invalid status: {status}')
    with transaction() as conn:
        set_status(conn, project_id, status)
    return jsonify({'success': True})


@bp.delete('/<int:project_id>')
def delete_project(project_id):
    jobs = current_app.extensions['jobs']
    for job in jobs.list(project_id=project_id, active_only=True):
        jobs.cancel(job['id'])
    remove_project(project_id)
    return jsonify({'success': True})
