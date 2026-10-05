"""
Dublin Core (DCMES 1.1) records for archived documents.

Produces oai_dc XML (the format OAI-PMH harvesters and most repository
systems accept) and a CSV with `dc.<element>` headers, which maps directly
onto DSpace / Omeka / ArchivesSpace import templates.
"""
import csv
import io
import json
import xml.etree.ElementTree as ET

OAI_DC_NS = 'http://www.openarchives.org/OAI/2.0/oai_dc/'
DC_NS = 'http://purl.org/dc/elements/1.1/'
XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'
OAI_DC_SCHEMA = 'http://www.openarchives.org/OAI/2.0/oai_dc.xsd'

ET.register_namespace('oai_dc', OAI_DC_NS)
ET.register_namespace('dc', DC_NS)
ET.register_namespace('xsi', XSI_NS)

# Order follows DCMES; CSV columns use the same order.
ELEMENTS = ('title', 'creator', 'subject', 'description', 'publisher', 'date',
            'type', 'format', 'identifier', 'language')

# Tesseract language codes -> BCP 47 tags (the form DC recommends for dc:language).
TESSERACT_TO_BCP47 = {
    'eng': 'en', 'spa': 'es', 'fra': 'fr', 'deu': 'de', 'ita': 'it', 'por': 'pt',
    'hin': 'hi', 'chi_sim': 'zh-Hans', 'chi_tra': 'zh-Hant', 'jpn': 'ja', 'rus': 'ru',
    'ara': 'ar', 'tam': 'ta', 'ben': 'bn', 'tel': 'te', 'mar': 'mr', 'urd': 'ur',
}

DESCRIPTION_CHARS = 300


def bcp47_language(tesseract_lang):
    """'eng+tam' -> ['en', 'ta']; unknown codes are passed through."""
    if not tesseract_lang:
        return []
    return [TESSERACT_TO_BCP47.get(code, code) for code in tesseract_lang.split('+') if code and code != 'osd']


def _split_keywords(text):
    return [k.strip() for k in (text or '').replace(';', ',').split(',') if k.strip()]


def _excerpt(text, limit=DESCRIPTION_CHARS):
    text = ' '.join((text or '').split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(' ', 1)[0]
    return cut + '…'


def build_record(project, institution='', language=None, archive_filename=None):
    """Map a project (as returned by get_project_data) to DC elements: {element: [values]}."""
    meta = project.get('metadata') or {}
    subjects = []
    if meta.get('subject'):
        subjects.append(meta['subject'])
    subjects += [k for k in _split_keywords(meta.get('keywords')) if k not in subjects]

    text = project.get('cleaned_text') or project.get('ocr_text') or ''
    record = {
        'title': [meta.get('title') or project.get('filename') or 'Untitled'],
        'creator': [meta['author']] if meta.get('author') else [],
        'subject': subjects,
        'description': [_excerpt(text)] if text.strip() else [],
        'publisher': [institution] if institution else [],
        'date': [str(meta['year'])] if meta.get('year') else [],
        'type': ['Text'],
        'format': ['application/pdf'],
        'identifier': [f"libradigit:{project['id']}"] + ([archive_filename] if archive_filename else []),
        'language': bcp47_language(language),
    }
    return record


def record_to_element(record):
    root = ET.Element(f'{{{OAI_DC_NS}}}dc', {f'{{{XSI_NS}}}schemaLocation': f'{OAI_DC_NS} {OAI_DC_SCHEMA}'})
    for element in ELEMENTS:
        for value in record.get(element, []):
            ET.SubElement(root, f'{{{DC_NS}}}{element}').text = value
    return root


def _serialize(element):
    ET.indent(element, space='  ')
    return ET.tostring(element, encoding='unicode', xml_declaration=True) + '\n'


def to_xml(record):
    return _serialize(record_to_element(record))


def collection_to_xml(records):
    """Several records wrapped in a simple <records> element."""
    root = ET.Element('records', {'count': str(len(records))})
    for record in records:
        root.append(record_to_element(record))
    return _serialize(root)


def collection_to_csv(records):
    """CSV with dc.<element> headers; repeated values are joined with '||'."""
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow([f'dc.{e}' for e in ELEMENTS])
    for record in records:
        writer.writerow(['||'.join(_csv_safe(v) for v in record.get(e, [])) for e in ELEMENTS])
    return out.getvalue()


def _csv_safe(value):
    # Spreadsheets execute cells starting with these characters as formulas.
    return "'" + value if value[:1] in ('=', '+', '-', '@', '\t', '\r') else value


def project_language(conn, project_id, default):
    """OCR language of the project's latest finished job, else the default setting."""
    row = conn.execute("""
        SELECT params FROM jobs WHERE project_id = ? AND status = 'completed'
        ORDER BY id DESC LIMIT 1""", (project_id,)).fetchone()
    if row and row['params']:
        lang = (json.loads(row['params']) or {}).get('language')
        if lang:
            return lang
    return default
