"""
Handling for plain-text files that were saved with a .pdf extension.
"""
import os
import shutil
import tempfile
from xml.sax.saxutils import escape

from flask import current_app

_METADATA_KEYS = ('Archive file for', 'Author', 'Year', 'Subject', 'Title')


def is_text_file(filepath):
    """True when a '.pdf' file does not start with the %PDF magic bytes."""
    try:
        with open(filepath, 'rb') as f:
            return not f.read(4).startswith(b'%PDF')
    except OSError:
        return False


def _split_metadata(content):
    metadata, body = {}, []
    for line in content.strip().split('\n'):
        key, sep, value = line.partition(':')
        if sep and key.strip() in _METADATA_KEYS:
            metadata[key.strip()] = value.strip()
        else:
            body.append(line)
    return metadata, body


def extract_text_from_text_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
    except OSError as e:
        return f'Error reading text file: {e}'
    note = ('\n\n[Note: This file was detected as a plain text file with a .pdf extension. '
            'The content above has been extracted as-is.]')
    return content.strip() + note


def convert_text_file_to_pdf(filepath):
    """Replace a text-masquerading-as-PDF file with a real PDF. Returns True on success."""
    try:
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            metadata, body = _split_metadata(f.read())

        fd, temp_path = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24,
                                     textColor='#1a1a1a', spaceAfter=30, alignment=TA_CENTER)
        heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=14,
                                       textColor='#333333', spaceAfter=12)
        body_style = ParagraphStyle('CustomBody', parent=styles['BodyText'], fontSize=11,
                                    textColor='#444444', alignment=TA_LEFT, spaceAfter=12)

        # Paragraph parses a mini-markup language, so all file content is escaped.
        title = metadata.get('Archive file for', metadata.get('Title', 'Document'))
        elements = [Paragraph(escape(title), title_style), Spacer(1, 0.2 * inch)]
        for key in ('Author', 'Year', 'Subject'):
            if key in metadata:
                elements.append(Paragraph(f'<b>{key}:</b> {escape(metadata[key])}', heading_style))
        elements.append(Spacer(1, 0.3 * inch))

        lines = [line for line in body if line.strip()]
        if lines:
            elements.extend(Paragraph(escape(line), body_style) for line in lines)
        else:
            elements.append(Paragraph(
                'This document was automatically converted from a text file to PDF format.', body_style))

        SimpleDocTemplate(temp_path, pagesize=letter, rightMargin=72, leftMargin=72,
                          topMargin=72, bottomMargin=18).build(elements)
        shutil.move(temp_path, filepath)
        return True
    except Exception:
        current_app.logger.exception('Text-to-PDF conversion failed for %s', filepath)
        return False
