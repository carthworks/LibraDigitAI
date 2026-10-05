"""
Builds the BagIt-style archive package for a finished project.

Layout: <archive root>/<Subject>/<Year>/<Name>/
            bagit.txt, bag-info.txt, manifest-md5.txt, manifest-sha256.txt
            data/<Name>.pdf
"""
import hashlib
import os
import re
import shutil
from datetime import datetime

import pymupdf
from flask import current_app
from PIL import Image

from ..db import get_config_value


def sanitize_component(text, fallback):
    """Reduce text to a safe single path component."""
    text = re.sub(r'[^a-zA-Z0-9_-]', '', (text or '').replace(' ', '_'))
    text = re.sub(r'_+', '_', text).strip('_')
    return text[:100] or fallback


def get_archive_root():
    custom = get_config_value('archive_storage_path')
    if custom:
        try:
            os.makedirs(custom, exist_ok=True)
            return custom
        except OSError as e:
            current_app.logger.warning('Custom archive path unusable (%s); using default', e)
    return current_app.config['ARCHIVE_FOLDER']


def _placeholder_pdf(path, lines):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    c = canvas.Canvas(path, pagesize=letter)
    y = 750
    for line in lines:
        c.drawString(100, y, line)
        y -= 20
    c.save()


def _materialize_pdf(source_path, final_path, labels):
    """Copy or convert the best available source into final_path as a PDF."""
    if not source_path or not os.path.exists(source_path):
        _placeholder_pdf(final_path, [f'Archive file for: {labels["title"]}', f'Author: {labels["author"]}',
                                      f'Year: {labels["year"]}', f'Subject: {labels["subject"]}',
                                      'Note: Original file not found'])
        return
    ext = os.path.splitext(source_path)[1].lower()
    if ext in current_app.config['IMAGE_EXTENSIONS']:
        try:
            with Image.open(source_path) as image:
                if image.mode not in ('RGB', 'L'):
                    image = image.convert('RGB')
                image.save(final_path, 'PDF', resolution=100.0)
        except Exception:
            current_app.logger.exception('Image to PDF conversion failed')
            _placeholder_pdf(final_path, [f'Error archiving file: {labels["title"]}',
                                          'Could not convert original image to PDF.'])
    else:
        shutil.copy2(source_path, final_path)


def _embed_pdf_metadata(final_path, metadata):
    now = datetime.now().strftime('D:%Y%m%d%H%M%S')
    temp_path = final_path + '.temp.pdf'
    try:
        with pymupdf.open(final_path) as doc:
            doc.set_metadata({
                'title': metadata.get('title') or '',
                'author': metadata.get('author') or '',
                'subject': metadata.get('subject') or '',
                'keywords': metadata.get('keywords') or '',
                'producer': 'LibraDigit AI - github.com/carthworks',
                'creator': 'LibraDigit AI',
                'creationDate': now,
                'modDate': now,
            })
            doc.save(temp_path, garbage=3, deflate=True)
        shutil.move(temp_path, final_path)
    except Exception as e:
        current_app.logger.warning('Failed to embed PDF metadata: %s', e)
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _digests(path):
    md5, sha256 = hashlib.md5(), hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            md5.update(chunk)
            sha256.update(chunk)
    return md5.hexdigest(), sha256.hexdigest()


def _write_bag_files(archive_base, final_path, filename_pdf, labels):
    institution = get_config_value('institution_name', '') or 'LibraDigit AI'
    with open(os.path.join(archive_base, 'bagit.txt'), 'w', encoding='utf-8') as f:
        f.write('BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n')
    with open(os.path.join(archive_base, 'bag-info.txt'), 'w', encoding='utf-8') as f:
        f.write(f'Source-Organization: {institution}\n')
        f.write(f'Contact-Name: {labels["author"]}\n')
        f.write(f'External-Description: {labels["title"]}\n')
        f.write(f'Bagging-Date: {datetime.now().strftime("%Y-%m-%d")}\n')
        f.write('Bag-Software-Agent: LibraDigit AI\n')
        f.write(f'Payload-Oxum: {os.path.getsize(final_path)}.1\n')
    md5, sha256 = _digests(final_path)
    with open(os.path.join(archive_base, 'manifest-md5.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{md5}  data/{filename_pdf}\n')
    with open(os.path.join(archive_base, 'manifest-sha256.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{sha256}  data/{filename_pdf}\n')


def build_archive(project, file_row):
    """Create the archive package; returns the path of the archived PDF."""
    metadata = project.get('metadata') or {}
    labels = {
        'subject': sanitize_component(metadata.get('subject'), 'General'),
        'year': sanitize_component(metadata.get('year'), 'Unknown'),
        'author': sanitize_component(metadata.get('author'), ''),
        'title': sanitize_component(metadata.get('title'), 'Untitled'),
    }
    name_parts = [p for p in (labels['author'], labels['year'] if metadata.get('year') else '', labels['title']) if p]
    project_name = '_'.join(name_parts)
    filename_pdf = project_name + '.pdf'

    archive_base = os.path.join(get_archive_root(), labels['subject'], labels['year'], project_name)
    data_dir = os.path.join(archive_base, 'data')
    os.makedirs(data_dir, exist_ok=True)
    final_path = os.path.join(data_dir, filename_pdf)

    source_path = None
    if file_row:
        # Priority: searchable OCR PDF > cleaned PDF > original upload
        for key in ('ocr_path', 'cleaned_path', 'original_path'):
            if file_row[key] and os.path.exists(file_row[key]):
                source_path = file_row[key]
                break

    _materialize_pdf(source_path, final_path, labels)
    _embed_pdf_metadata(final_path, metadata)
    try:
        _write_bag_files(archive_base, final_path, filename_pdf, labels)
    except OSError as e:
        current_app.logger.warning('Failed to write BagIt files: %s', e)
    return final_path
