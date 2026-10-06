"""End-to-end workflow: upload -> OCR -> cleanup -> metadata -> archive -> search."""
import io
import os
import time

import pymupdf as fitz
from conftest import requires_tesseract, text_image_bytes, upload

from app.processors.metadata_extractor import extract_metadata
from app.routes.documents import _chunks

LINES = ['The Annual Report of the Library Board', 'was presented in March 1954 by the Chair.']


@requires_tesseract
def test_image_full_workflow(client, app, tmp_path):
    project = upload(client, 'report.png', text_image_bytes(LINES)).get_json()['project']
    pid = project['id']

    ocr = client.post(f'/api/ocr/{pid}', json={'language': 'eng'})
    assert ocr.status_code == 200, ocr.get_json()
    data = client.get(f'/api/projects/{pid}').get_json()['project']
    assert 'Annual Report' in data['ocr_text']
    assert '\\n' not in data['ocr_text']  # regression: literal backslash-n
    assert data['status'] == 'cleanup'
    assert data['files']['ocr_path'] and os.path.exists(data['files']['ocr_path'])

    # Searchable immediately after OCR, with the snippet taken from the content.
    listed = client.get('/api/projects').get_json()['projects'][0]
    assert 80 <= listed['mean_confidence'] <= 100  # real Tesseract word confidence
    assert listed['has_archive'] is False and listed['archive_format'] is None

    hits = client.get('/api/search?q=Library').get_json()
    assert hits['count'] == 1 and '<mark>' in hits['results'][0]['snippet']

    pdf = client.get(f'/api/projects/{pid}/searchable_pdf')
    assert pdf.status_code == 200 and pdf.data.startswith(b'%PDF')
    assert 'Searchable_report.pdf' in pdf.headers['Content-Disposition']

    assert client.post(f'/api/cleanup/{pid}', json={'cleaned_text': 'Edited zebra transcript'}).status_code == 200
    assert client.get('/api/search?q=zebra').get_json()['count'] == 1

    custom_root = tmp_path / 'custom_archive'
    client.post('/api/settings', json={'archive_storage_path': str(custom_root), 'institution_name': 'City Library'})
    meta = {'title': 'Annual Report', 'author': 'Jane Doe', 'year': '1954', 'subject': 'History', 'keywords': 'board'}
    assert client.post(f'/api/metadata/{pid}', json=meta).status_code == 200

    archive = client.post(f'/api/archive/{pid}').get_json()
    final = archive['archive_path']
    # Regression: the configured archive location used to be ignored.
    assert final.startswith(str(custom_root))
    bag = os.path.dirname(os.path.dirname(final))
    for name in ('bagit.txt', 'bag-info.txt', 'manifest-md5.txt', 'manifest-sha256.txt'):
        assert os.path.exists(os.path.join(bag, name)), name
    with open(os.path.join(bag, 'bag-info.txt')) as f:
        assert 'City Library' in f.read()
    with fitz.open(final) as doc:
        assert doc.metadata['title'] == 'Annual Report'

    listed = client.get('/api/projects').get_json()['projects'][0]
    assert listed['has_archive'] is True and listed['archive_format'] == 'PDF/A-2b'
    assert listed['title'] == 'Annual Report'

    served = client.get(f'/api/projects/{pid}/file?type=pdf')
    assert served.status_code == 200 and served.data.startswith(b'%PDF')

    analytics = client.get('/api/analytics').get_json()
    assert analytics['total_projects'] == 1
    assert analytics['storage_usage']['total_bytes'] > 0
    assert analytics['subjects'] == [{'name': 'History', 'value': 1}]


@requires_tesseract
def test_scanned_pdf_is_ocrd(client):
    img = text_image_bytes(LINES)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(page.rect, stream=img.getvalue())
    pdf_bytes = doc.tobytes()
    pid = upload(client, 'scan.pdf', pdf_bytes).get_json()['project']['id']
    res = client.post(f'/api/ocr/{pid}').get_json()
    assert res['file_type'] == 'PDF (Scanned/OCR)'
    assert 'Library Board' in client.get(f'/api/projects/{pid}').get_json()['project']['ocr_text']


def test_text_pdf_uses_text_layer(client):
    doc = fitz.open()
    doc.new_page().insert_text((72, 72), 'Digital text layer document with plenty of words in it for extraction.')
    pid = upload(client, 'born_digital.pdf', doc.tobytes()).get_json()['project']['id']
    assert client.post(f'/api/ocr/{pid}').get_json()['file_type'] == 'PDF'
    assert 'text layer' in client.get(f'/api/projects/{pid}').get_json()['project']['ocr_text']


def test_text_file_with_pdf_extension_and_markup(client):
    content = 'Title: Notes <draft>\nAuthor: A & B\nBody line with <b>tags</b> & ampersands'.encode()
    pid = upload(client, 'notes.pdf', content).get_json()['project']['id']
    res = client.post(f'/api/ocr/{pid}').get_json()
    assert res['file_type'] == 'text file (auto-converted to PDF)'
    text = client.get(f'/api/projects/{pid}').get_json()['project']['ocr_text']
    assert '<b>tags</b>' in text


@requires_tesseract
def test_batch_processing_and_cancel(client):
    files = [(text_image_bytes(LINES), f'page{i}.png') for i in range(2)] + [(io.BytesIO(b'x'), 'readme.txt')]
    res = client.post('/api/batch/create', data={'files': files, 'batch_name': 'Test'},
                      content_type='multipart/form-data').get_json()
    assert res['files_uploaded'] == 2 and res['skipped'] == ['readme.txt']
    bid = res['batch_id']

    assert client.post(f'/api/batch/{bid}/start').status_code == 200
    for _ in range(120):
        status = client.get(f'/api/batch/{bid}/status').get_json()
        if status['status'] in ('completed', 'completed_with_errors'):
            break
        time.sleep(0.25)
    assert status['status'] == 'completed'
    for pid in res['project_ids']:
        assert 'Library' in client.get(f'/api/projects/{pid}').get_json()['project']['ocr_text']

    # A cancelled batch must not be processed afterwards.
    res2 = client.post('/api/batch/create', data={'files': [(text_image_bytes(LINES), 'c.png')]},
                       content_type='multipart/form-data').get_json()
    client.post(f"/api/batch/{res2['batch_id']}/cancel")
    assert client.post(f"/api/batch/{res2['batch_id']}/start").status_code == 409
    status = client.get(f"/api/batch/{res2['batch_id']}/status").get_json()
    assert status['status'] == 'cancelled'
    assert client.get(f"/api/projects/{res2['project_ids'][0]}").get_json()['project']['status'] == 'upload'


def test_bulk_metadata(client):
    ids = [upload(client, f'd{i}.pdf').get_json()['project']['id'] for i in range(3)]
    res = client.post('/api/batch/bulk-metadata', json={
        'project_ids': ids, 'metadata': {'subject': 'Maps'}, 'title_modifications': {'prefix': 'MAP-'}})
    assert res.get_json()['updated_count'] == 3
    meta = client.get(f'/api/projects/{ids[0]}').get_json()['project']['metadata']
    assert meta['subject'] == 'Maps' and meta['title'] == 'MAP-d0.pdf'
    assert client.post('/api/batch/bulk-metadata', json={'project_ids': ['x']}).status_code == 400


def test_metadata_validation(client):
    pid = upload(client, 'd.pdf').get_json()['project']['id']
    assert client.post(f'/api/metadata/{pid}', json={'title': ''}).status_code == 400
    assert client.post(f'/api/metadata/{pid}', json={'title': 'T', 'year': '19x4'}).status_code == 400
    assert client.post(f'/api/metadata/{pid}', json={'title': 'T', 'year': 1954}).status_code == 200


def test_translation_chunks_respect_limit():
    text = '\n\n'.join(['word ' * 300] * 20) + '\n\n' + 'x' * 10000
    chunks = list(_chunks(text))
    assert all(len(c) <= 4500 for c in chunks)
    assert ''.join(chunks).replace('\n', '') == text.replace('\n', '')


def test_translation_can_be_disabled(make_app):
    client = make_app(TRANSLATION_ENABLED=False).test_client()
    assert client.post('/api/translate', json={'text': 'hola'}).status_code == 403


def test_metadata_extractor():
    sample = ('Introduction to Artificial Intelligence\n\nBy Dr. John Smith\n\nPublished: 2024\n\n'
              'Keywords: artificial intelligence, machine learning, neural networks')
    result = extract_metadata(sample, 'ai_introduction.pdf')
    assert result['year'] == '2024'
    assert set(result) >= {'title', 'author', 'year', 'subject', 'keywords', 'confidence_scores'}


def test_ebooks_listing_uses_stored_word_counts_and_short_snippets(client, app):
    long_text = ' '.join(f'word{i}' for i in range(400))
    pid = upload(client, 'notes.pdf', ('Title: Notes\n' + long_text).encode()).get_json()['project']['id']
    client.post(f'/api/ocr/{pid}')
    listed = {e['id']: e for e in client.get('/api/projects/ebooks').get_json()['ebooks']}[pid]
    assert listed['word_count'] >= 400
    assert listed['snippet'].endswith('...') and len(listed['snippet']) == 303
    assert 'original_text' not in listed and 'cleaned_text' not in listed

    # Editing the text updates the stored count.
    client.post(f'/api/cleanup/{pid}', json={'cleaned_text': 'just three words'})
    listed = {e['id']: e for e in client.get('/api/projects/ebooks').get_json()['ebooks']}[pid]
    assert listed['word_count'] == 3 and listed['snippet'] == 'just three words'


def test_word_counts_backfilled_for_existing_databases(make_app, app):
    import sqlite3
    with sqlite3.connect(app.config['DATABASE']) as conn:
        conn.execute("INSERT INTO projects (id, filename, filepath, status) VALUES (900, 'old.pdf', '', 'cleanup')")
        conn.execute("INSERT INTO ocr_text (project_id, original_text) VALUES (900, 'one two three four')")
    restarted = make_app().test_client()
    listed = {e['id']: e for e in restarted.get('/api/projects/ebooks').get_json()['ebooks']}[900]
    assert listed['word_count'] == 4
