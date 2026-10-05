"""Regression tests for the issues found in the security audit."""
import os
import sqlite3

from conftest import ALLOWED_ORIGIN, upload


def test_upload_filename_cannot_escape_upload_folder(client, app, tmp_path):
    res = upload(client, '../../escaped.pdf')
    assert res.status_code == 200
    path = res.get_json()['project']['filepath']
    assert os.path.dirname(path) == app.config['UPLOAD_FOLDER']
    assert not (tmp_path / 'escaped.pdf').exists()


def test_windows_style_traversal_is_neutralised(client, app):
    res = upload(client, '..\\..\\evil.pdf')
    path = res.get_json()['project']['filepath']
    assert os.path.dirname(path) == app.config['UPLOAD_FOLDER']
    name = res.get_json()['project']['filename']
    assert '/' not in name and '\\' not in name


def test_duplicate_uploads_do_not_overwrite_each_other(client):
    first = upload(client, 'scan.pdf', b'%PDF-1 first').get_json()['project']['filepath']
    second = upload(client, 'scan.pdf', b'%PDF-1 second').get_json()['project']['filepath']
    assert first != second
    with open(first, 'rb') as f:
        assert f.read() == b'%PDF-1 first'


def test_unsupported_extension_rejected(client):
    res = upload(client, 'payload.html', b'<script>')
    assert res.status_code == 400


def test_non_ascii_filename_keeps_extension(client):
    res = upload(client, 'தமிழ்.png', b'png')
    assert res.status_code == 200
    assert res.get_json()['project']['filepath'].endswith('.png')


def test_json_project_cannot_point_at_arbitrary_file(client):
    res = client.post('/api/projects', json={'filename': 'x', 'filepath': '/etc/hostname'})
    pid = res.get_json()['project']['id']
    assert res.get_json()['project']['filepath'] == ''
    assert client.get(f'/api/projects/{pid}/file').status_code == 404


def test_file_endpoint_refuses_paths_outside_app_folders(client, app, tmp_path):
    outside = tmp_path / 'secret.txt'
    outside.write_text('secret')
    pid = upload(client, 'doc.pdf').get_json()['project']['id']
    with sqlite3.connect(app.config['DATABASE']) as conn:
        conn.execute('UPDATE files SET original_path = ?, final_path = ? WHERE project_id = ?',
                     (str(outside), str(outside), pid))
    assert client.get(f'/api/projects/{pid}/file').status_code == 404


def test_foreign_origin_blocked(client):
    evil = {'Origin': 'https://evil.example'}
    assert client.get('/api/projects', headers=evil).status_code == 403
    assert upload(client, 'x.pdf', Origin='https://evil.example').status_code == 403
    res = client.get('/api/projects', headers={'Origin': ALLOWED_ORIGIN})
    assert res.status_code == 200
    assert res.headers.get('Access-Control-Allow-Origin') == ALLOWED_ORIGIN


def test_token_required_when_configured(make_app):
    client = make_app(API_TOKEN='s3cret').test_client()
    assert client.get('/api/projects').status_code == 401
    assert client.get('/api/projects', headers={'X-LibraDigit-Token': 'wrong'}).status_code == 401
    assert client.get('/api/projects', headers={'X-LibraDigit-Token': 's3cret'}).status_code == 200
    assert client.get('/api/health').status_code == 200


def test_invalid_ocr_language_rejected(client):
    pid = upload(client, 'doc.pdf').get_json()['project']['id']
    res = client.post(f'/api/ocr/{pid}', json={'language': 'eng --psm 0; rm'})
    assert res.status_code == 400


def test_search_handles_fts_syntax_and_bad_limits(client):
    for q in ('a"b', 'title:x', 'NEAR(', '"', 'AND OR', '*'):
        for exact in ('true', 'false'):
            res = client.get('/api/search', query_string={'q': q, 'exact': exact, 'smart': 'true'})
            assert res.status_code == 200, q
    assert client.get('/api/search?q=x&limit=abc').status_code == 200
    assert client.get('/api/search?q=x&limit=99999').status_code == 200


def test_delete_removes_all_traces(client, app):
    res = upload(client, 'doc.pdf')
    project = res.get_json()['project']
    pid = project['id']
    client.post(f'/api/metadata/{pid}', json={'title': 'Delete Me'})
    assert client.get('/api/search?q=Delete').get_json()['count'] == 1

    assert client.delete(f'/api/projects/{pid}').status_code == 200
    assert client.get('/api/search?q=Delete').get_json()['count'] == 0
    assert not os.path.exists(project['filepath'])
    with sqlite3.connect(app.config['DATABASE']) as conn:
        for table in ('files', 'metadata', 'ocr_text', 'metadata_suggestions', 'batch_items'):
            assert conn.execute(f'SELECT count(*) FROM {table} WHERE project_id = ?', (pid,)).fetchone()[0] == 0


def test_settings_validation(client, tmp_path):
    assert client.post('/api/settings', json={'archive_storage_path': 'relative/dir'}).status_code == 400
    assert client.post('/api/settings', json={'pdf_quality': 'ultra'}).status_code == 400
    assert client.post('/api/settings', json={'ocr_engine': 'evil'}).status_code == 400
    assert client.post('/api/settings', json={'institution_name': 'a\nb'}).status_code == 400
    ok = client.post('/api/settings', json={'archive_storage_path': str(tmp_path / 'custom'), 'pdf_quality': 'max'})
    assert ok.status_code == 200


def test_errors_do_not_leak_tracebacks(client):
    res = client.post('/api/metadata/1', data='not json', content_type='application/json')
    body = res.get_data(as_text=True)
    assert 'Traceback' not in body and 'details' not in res.get_json()


def test_invalid_status_rejected(client):
    pid = upload(client, 'doc.pdf').get_json()['project']['id']
    assert client.put(f'/api/projects/{pid}/status', json={'status': 'pwned'}).status_code == 400
    assert client.put(f'/api/projects/{pid}/status', json={'status': 'cleanup'}).status_code == 200
