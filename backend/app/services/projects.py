"""
Project records: lookup, creation and deletion.
"""
import os

from flask import current_app

from .. import search_index
from ..db import connect, transaction
from ..security import is_within


def get_project_data(project_id, conn=None):
    """Return a project joined with its files, metadata and OCR text, or None."""
    own = conn is None
    conn = conn or connect()
    try:
        project = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
        if not project:
            return None
        data = dict(project)

        files = conn.execute('SELECT * FROM files WHERE project_id = ?', (project_id,)).fetchone()
        if files:
            data['files'] = dict(files)

        metadata = conn.execute('SELECT * FROM metadata WHERE project_id = ?', (project_id,)).fetchone()
        if metadata:
            data['metadata'] = dict(metadata)

        ocr = conn.execute('SELECT * FROM ocr_text WHERE project_id = ?', (project_id,)).fetchone()
        if ocr:
            data['ocr_text'] = ocr['original_text'] or ''
            data['cleaned_text'] = ocr['cleaned_text'] or ''
            data['confidence_data'] = ocr['confidence_data']
        return data
    finally:
        if own:
            conn.close()


def create_project(conn, filename, filepath):
    """Insert a project plus its files/ocr_text rows; returns the new id."""
    cur = conn.execute(
        "INSERT INTO projects (filename, filepath, status) VALUES (?, ?, 'upload')",
        (filename, filepath),
    )
    project_id = cur.lastrowid
    conn.execute('INSERT INTO files (project_id, original_path) VALUES (?, ?)', (project_id, filepath))
    conn.execute('INSERT INTO ocr_text (project_id) VALUES (?)', (project_id,))
    return project_id


def set_status(conn, project_id, status):
    conn.execute(
        'UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        (status, project_id),
    )


def delete_project(project_id):
    """
    Delete a project and every row that references it.

    Working files inside the upload folder are removed too; finished archive
    packages are left alone because they are the user's deliverable.
    """
    upload_folder = current_app.config['UPLOAD_FOLDER']
    with transaction() as conn:
        files = conn.execute(
            'SELECT original_path, ocr_path, cleaned_path FROM files WHERE project_id = ?', (project_id,)
        ).fetchone()
        for table in ('files', 'metadata', 'ocr_text', 'metadata_suggestions', 'batch_items'):
            conn.execute(f'DELETE FROM {table} WHERE project_id = ?', (project_id,))
        search_index.remove(project_id, conn=conn)
        deleted = conn.execute('DELETE FROM projects WHERE id = ?', (project_id,)).rowcount

    if files:
        for path in files:
            if path and is_within(path, upload_folder) and os.path.isfile(path):
                try:
                    os.remove(path)
                except OSError:
                    current_app.logger.warning('Could not remove %s', path)
    return deleted > 0
