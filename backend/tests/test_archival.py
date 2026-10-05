"""PDF/A-2b archive output (validated with veraPDF) and Dublin Core export."""
import csv
import hashlib
import io
import os
import shutil
import subprocess
import xml.etree.ElementTree as ET

import pikepdf
import pymupdf
import pytest
from conftest import requires_tesseract, text_image_bytes, upload

from app.services.pdfa import preflight

DC = '{http://purl.org/dc/elements/1.1/}'
LINES = ['The Annual Report of the Library Board', 'was presented in March 1954 by the Chair.']
META = {'title': 'Annual Report', 'author': 'Jane Doe', 'year': '1954', 'subject': 'History',
        'keywords': 'board, minutes; library'}

VERAPDF = os.environ.get('VERAPDF') or shutil.which('verapdf')
requires_verapdf = pytest.mark.skipif(not VERAPDF, reason='veraPDF not installed (set VERAPDF=/path/to/verapdf)')


def verapdf_passes(path):
    out = subprocess.run([VERAPDF, '-f', '2b', '--format', 'text', path], capture_output=True, text=True, timeout=120)
    return out.stdout.strip().startswith('PASS'), out.stdout


def archive(client, pid, meta=META):
    assert client.post(f'/api/metadata/{pid}', json=meta).status_code == 200
    res = client.post(f'/api/archive/{pid}')
    assert res.status_code == 200, res.get_json()
    return res.get_json()


def bag_dir(archive_result):
    return os.path.dirname(os.path.dirname(archive_result['archive_path']))


@requires_tesseract
@requires_verapdf
def test_ocr_image_archive_is_valid_pdfa_with_xmp(client):
    pid = upload(client, 'report.png', text_image_bytes(LINES)).get_json()['project']['id']
    client.post(f'/api/ocr/{pid}', json={'language': 'eng'})
    result = archive(client, pid)

    assert result['pdfa'] == {'conformance': 'PDF/A-2b', 'pdfa': True, 'issues': []}
    ok, report = verapdf_passes(result['archive_path'])
    assert ok, report
    with pikepdf.open(result['archive_path']) as pdf:
        meta = pdf.open_metadata()
        assert meta['dc:title'] == 'Annual Report'
        assert meta['dc:creator'] == ['Jane Doe']
        assert set(meta['dc:subject']) == {'board', 'minutes', 'library'}
        assert meta['pdfaid:part'] == '2'
        assert str(pdf.docinfo['/Title']) == 'Annual Report'
    # The searchable text layer survives conversion.
    with pymupdf.open(result['archive_path']) as doc:
        assert 'Library' in doc[0].get_text()


@requires_tesseract
@requires_verapdf
def test_scanned_multipage_pdf_archive_is_valid_pdfa(client):
    img = text_image_bytes(LINES).getvalue()
    doc = pymupdf.open()
    for _ in range(2):
        page = doc.new_page()
        page.insert_image(page.rect, stream=img)
    pid = upload(client, 'scan.pdf', doc.tobytes()).get_json()['project']['id']
    client.post(f'/api/ocr/{pid}')
    result = archive(client, pid)
    assert result['pdfa']['pdfa'] is True
    ok, report = verapdf_passes(result['archive_path'])
    assert ok, report


@requires_verapdf
def test_image_without_ocr_and_placeholder_archives_are_valid_pdfa(client):
    pid = upload(client, 'photo.png', text_image_bytes(['No OCR run'])).get_json()['project']['id']
    image_result = archive(client, pid)
    assert image_result['pdfa']['pdfa'] is True
    assert verapdf_passes(image_result['archive_path'])[0]

    # A record without a file gets a placeholder PDF, which must also conform.
    pid = client.post('/api/projects', json={'filename': 'lost.pdf'}).get_json()['project']['id']
    placeholder = archive(client, pid, {**META, 'title': 'Lost Document'})
    assert placeholder['pdfa']['pdfa'] is True
    ok, report = verapdf_passes(placeholder['archive_path'])
    assert ok, report


def test_imported_pdf_is_not_labelled_pdfa_but_gets_metadata(client):
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), 'Born-digital report with a real text layer for archiving.')
    pid = upload(client, 'born_digital.pdf', doc.tobytes()).get_json()['project']['id']
    client.post(f'/api/ocr/{pid}')
    result = archive(client, pid)

    assert result['pdfa']['pdfa'] is False and result['pdfa']['conformance'] == 'PDF'
    assert any('Imported PDF' in issue for issue in result['pdfa']['issues'])
    assert any('Font not embedded' in issue for issue in result['pdfa']['issues'])
    with pikepdf.open(result['archive_path']) as pdf:
        meta = pdf.open_metadata()
        assert meta['dc:title'] == 'Annual Report'
        assert 'pdfaid:part' not in meta
    with open(os.path.join(bag_dir(result), 'bag-info.txt')) as f:
        assert 'Archival-Format: PDF\n' in f.read()


def test_preflight_flags_unembedded_fonts(tmp_path):
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), 'Helvetica is not embedded')
    path = tmp_path / 'base14.pdf'
    doc.save(path)
    with pikepdf.open(path) as pdf:
        assert preflight(pdf) == ['Font not embedded: Helvetica']


def test_bag_contains_dublin_core_and_valid_tag_manifest(client):
    pid = upload(client, 'photo.png', text_image_bytes(LINES)).get_json()['project']['id']
    result = archive(client, pid)
    bag = bag_dir(result)

    root = ET.parse(os.path.join(bag, 'dublin-core.xml')).getroot()
    assert root.tag == '{http://www.openarchives.org/OAI/2.0/oai_dc/}dc'
    assert root.find(f'{DC}title').text == 'Annual Report'
    assert root.find(f'{DC}date').text == '1954'

    with open(os.path.join(bag, 'tagmanifest-sha256.txt')) as f:
        entries = [line.split('  ') for line in f.read().splitlines()]
    assert {name for _, name in entries} >= {'bagit.txt', 'bag-info.txt', 'dublin-core.xml', 'manifest-sha256.txt'}
    for digest, name in entries:
        with open(os.path.join(bag, name), 'rb') as f:
            assert hashlib.sha256(f.read()).hexdigest() == digest, name
    with open(os.path.join(bag, 'manifest-sha256.txt')) as f:
        digest, rel = f.read().split()
    with open(os.path.join(bag, rel), 'rb') as f:
        assert hashlib.sha256(f.read()).hexdigest() == digest
    with open(os.path.join(bag, 'bag-info.txt')) as f:
        assert 'Archival-Format: PDF/A-2b' in f.read()


def test_project_dublin_core_download(client):
    pid = upload(client, 'doc.png', text_image_bytes(LINES)).get_json()['project']['id']
    client.post('/api/settings', json={'institution_name': 'City <Library> & Archive'})
    client.post(f'/api/metadata/{pid}', json={**META, 'title': 'Minutes <1954> & more'})

    res = client.get(f'/api/projects/{pid}/dublin-core')
    assert res.status_code == 200
    assert 'attachment' in res.headers['Content-Disposition']
    root = ET.fromstring(res.data)
    assert root.find(f'{DC}title').text == 'Minutes <1954> & more'
    assert root.find(f'{DC}publisher').text == 'City <Library> & Archive'
    assert [e.text for e in root.findall(f'{DC}subject')] == ['History', 'board', 'minutes', 'library']
    assert root.find(f'{DC}language').text == 'en'  # default OCR language eng -> en
    assert root.find(f'{DC}identifier').text == f'libradigit:{pid}'
    assert client.get('/api/projects/9999/dublin-core').status_code == 404


def test_catalogue_export_csv_and_xml(client):
    archived = upload(client, 'a.png', text_image_bytes(LINES)).get_json()['project']['id']
    archive(client, archived, {**META, 'title': '=HYPERLINK("http://evil")'})
    draft = upload(client, 'b.png', text_image_bytes(LINES)).get_json()['project']['id']
    client.post(f'/api/metadata/{draft}', json={'title': 'Draft'})
    client.put(f'/api/projects/{draft}/status', json={'status': 'metadata'})

    res = client.get('/api/export/metadata?format=csv')
    assert res.status_code == 200 and res.mimetype == 'text/csv'
    rows = list(csv.reader(io.StringIO(res.data.decode('utf-8-sig'))))
    assert rows[0][:3] == ['dc.title', 'dc.creator', 'dc.subject']
    assert len(rows) == 2  # header + the archived project only
    assert rows[1][0].startswith("'=")  # spreadsheet formula neutralised

    everything = client.get('/api/export/metadata?format=csv&scope=all').data.decode('utf-8-sig')
    assert len(list(csv.reader(io.StringIO(everything)))) == 3

    xml = ET.fromstring(client.get('/api/export/metadata?format=xml&scope=all').data)
    assert xml.tag == 'records' and xml.get('count') == '2'
    assert client.get('/api/export/metadata?format=pdf').status_code == 400
