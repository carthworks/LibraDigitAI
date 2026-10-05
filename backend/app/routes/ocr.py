"""
Synchronous OCR endpoints, kept for scripts and API clients.

The UI uses /api/jobs instead so long documents run in the background with
progress; both paths call the same task functions.
"""
from flask import Blueprint, jsonify, request

from ..services.ocr_tasks import TaskError, run_advanced_ocr, run_handwritten_to_pdf, run_ocr

bp = Blueprint('ocr', __name__, url_prefix='/api')


def _call(task, project_id):
    params = request.get_json(silent=True) or {}
    try:
        return jsonify(task(project_id, params))
    except TaskError as e:
        return jsonify({'error': str(e), 'success': False}), e.status


@bp.post('/ocr/<int:project_id>')
def ocr(project_id):
    return _call(run_ocr, project_id)


@bp.post('/ocr/advanced/<int:project_id>')
def advanced_ocr(project_id):
    return _call(run_advanced_ocr, project_id)


@bp.post('/handwritten-to-pdf/<int:project_id>')
def handwritten_to_pdf(project_id):
    return _call(run_handwritten_to_pdf, project_id)
