"""Background OCR jobs: progress, cancellation, conflicts and restart recovery."""
import sqlite3
import time

import pymupdf
from conftest import requires_tesseract, text_image_bytes, upload

LINES = ['The Annual Report of the Library Board', 'was presented in March 1954 by the Chair.']


def scanned_pdf(pages):
    img = text_image_bytes(LINES).getvalue()
    doc = pymupdf.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_image(page.rect, stream=img)
    return doc.tobytes()


def start(client, project_id, kind='ocr', **params):
    return client.post('/api/jobs', json={'kind': kind, 'project_id': project_id, 'params': params})


def wait(client, job_id, until=('completed', 'failed', 'cancelled'), timeout=60, seen=None):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f'/api/jobs/{job_id}').get_json()['job']
        if seen is not None:
            seen.append(job)
        if job['status'] in until:
            return job
        time.sleep(0.05)
    raise AssertionError(f'job {job_id} stuck in {job["status"]}')


@requires_tesseract
def test_ocr_job_reports_page_progress_and_saves_result(client):
    pid = upload(client, 'scan.pdf', scanned_pdf(3)).get_json()['project']['id']
    res = start(client, pid, language='eng')
    assert res.status_code == 202
    job = res.get_json()['job']
    assert job['status'] == 'queued' and job['kind'] == 'ocr'

    seen = []
    done = wait(client, job['id'], seen=seen)
    assert done['status'] == 'completed', done
    assert done['progress'] == 100.0
    assert done['result']['file_type'] == 'PDF (Scanned/OCR)'
    assert any(s['status'] == 'running' and s['total'] == 3 and 'page' in (s['message'] or '') for s in seen)

    project = client.get(f'/api/projects/{pid}').get_json()['project']
    assert 'Library Board' in project['ocr_text'] and project['status'] == 'cleanup'
    assert client.get('/api/search?q=Library').get_json()['count'] == 1


@requires_tesseract
def test_running_job_can_be_cancelled_between_pages(client):
    pid = upload(client, 'long.pdf', scanned_pdf(6)).get_json()['project']['id']
    job = start(client, pid).get_json()['job']
    wait(client, job['id'], until=('running',))
    # Wait for the first page to finish so cancellation happens mid-document.
    deadline = time.time() + 30
    while client.get(f"/api/jobs/{job['id']}").get_json()['job']['current'] < 1 and time.time() < deadline:
        time.sleep(0.05)

    assert client.post(f"/api/jobs/{job['id']}/cancel").status_code == 200
    done = wait(client, job['id'])
    assert done['status'] == 'cancelled'
    project = client.get(f'/api/projects/{pid}').get_json()['project']
    assert project['status'] == 'upload' and not project['ocr_text']


@requires_tesseract
def test_queued_job_cancel_is_immediate_and_never_runs(client):
    first = upload(client, 'a.pdf', scanned_pdf(3)).get_json()['project']['id']
    second = upload(client, 'b.png', text_image_bytes(LINES)).get_json()['project']['id']
    running = start(client, first).get_json()['job']
    queued = start(client, second).get_json()['job']

    cancelled = client.post(f"/api/jobs/{queued['id']}/cancel").get_json()['job']
    assert cancelled['status'] == 'cancelled'
    wait(client, running['id'])
    time.sleep(0.3)
    assert client.get(f"/api/jobs/{queued['id']}").get_json()['job']['status'] == 'cancelled'
    assert client.get(f'/api/projects/{second}').get_json()['project']['status'] == 'upload'


@requires_tesseract
def test_one_active_job_per_project(client):
    pid = upload(client, 'scan.pdf', scanned_pdf(2)).get_json()['project']['id']
    first = start(client, pid).get_json()['job']
    conflict = start(client, pid, kind='advanced_ocr')
    assert conflict.status_code == 409
    assert conflict.get_json()['job']['id'] == first['id']
    wait(client, first['id'])
    assert start(client, pid).status_code == 202  # allowed again once finished


def test_job_validation(client):
    pid = upload(client, 'doc.pdf').get_json()['project']['id']
    assert start(client, pid, kind='rm -rf').status_code == 400
    assert start(client, pid, language='eng;ls').status_code == 400
    assert start(client, 99999).status_code == 404
    assert client.post('/api/jobs', json={'kind': 'ocr', 'project_id': 'x'}).status_code == 400
    assert client.get('/api/jobs/12345').status_code == 404


def test_task_errors_are_reported_on_the_job(client, app):
    pid = upload(client, 'doc.pdf').get_json()['project']['id']
    with sqlite3.connect(app.config['DATABASE']) as conn:
        conn.execute("UPDATE projects SET filepath = '/nonexistent/file.pdf' WHERE id = ?", (pid,))
    job = start(client, pid).get_json()['job']
    done = wait(client, job['id'])
    assert done['status'] == 'failed' and done['error'] == 'File not found'


@requires_tesseract
def test_restart_recovers_interrupted_and_queued_jobs(make_app, tmp_path):
    app = make_app()
    client = app.test_client()
    pid = upload(client, 'img.png', text_image_bytes(LINES)).get_json()['project']['id']
    app.extensions['jobs'].shutdown()

    with sqlite3.connect(app.config['DATABASE']) as conn:
        conn.execute("INSERT INTO jobs (kind, project_id, status, params) VALUES ('ocr', ?, 'running', '{}')", (pid,))
        conn.execute("INSERT INTO jobs (kind, project_id, status, params) VALUES ('ocr', ?, 'queued', '{}')", (pid,))
        interrupted, queued = [r[0] for r in conn.execute('SELECT id FROM jobs ORDER BY id')]

    restarted = make_app().test_client()
    assert restarted.get(f'/api/jobs/{interrupted}').get_json()['job']['status'] == 'failed'
    assert wait(restarted, queued)['status'] == 'completed'
    active = restarted.get(f'/api/jobs?project_id={pid}&active=true').get_json()['jobs']
    assert active == []


@requires_tesseract
def test_deleting_a_project_cancels_its_job(client):
    pid = upload(client, 'long.pdf', scanned_pdf(4)).get_json()['project']['id']
    job = start(client, pid).get_json()['job']
    wait(client, job['id'], until=('running',))
    assert client.delete(f'/api/projects/{pid}').status_code == 200
    assert wait(client, job['id'])['status'] in ('cancelled', 'failed')
