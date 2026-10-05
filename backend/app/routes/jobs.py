"""
Background jobs: start OCR work, poll progress, cancel.
"""
from flask import Blueprint, current_app, jsonify, request

from ..jobs import JobConflict
from ..security import ValidationError, validate_language
from ..services.projects import get_project_data

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')


def _manager():
    return current_app.extensions['jobs']


@bp.post('')
def create_job():
    data = request.get_json(silent=True) or {}
    kind = data.get('kind')
    if kind not in _manager().tasks:
        raise ValidationError(f'Unknown job kind: {kind}')
    try:
        project_id = int(data.get('project_id'))
    except (TypeError, ValueError):
        raise ValidationError('project_id must be an integer') from None
    if not get_project_data(project_id):
        return jsonify({'error': 'Project not found'}), 404

    params = data.get('params') or {}
    if not isinstance(params, dict):
        raise ValidationError('params must be an object')
    # Validate early so bad input fails the request, not the job later.
    validate_language(params.get('language'))
    if 'title' in params:
        params['title'] = str(params['title'])[:300]

    try:
        job = _manager().submit(kind, project_id, params)
    except JobConflict as e:
        return jsonify({'error': str(e), 'job': e.job}), 409
    return jsonify({'job': job}), 202


@bp.get('')
def list_jobs():
    project_id = request.args.get('project_id', type=int)
    active = request.args.get('active', 'false').lower() == 'true'
    limit = max(1, min(request.args.get('limit', 50, type=int) or 50, 200))
    return jsonify({'jobs': _manager().list(project_id=project_id, active_only=active, limit=limit)})


@bp.get('/<int:job_id>')
def get_job(job_id):
    job = _manager().get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify({'job': job})


@bp.post('/<int:job_id>/cancel')
def cancel_job(job_id):
    job = _manager().cancel(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify({'job': job})
