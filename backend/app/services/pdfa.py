"""
PDF/A-2b conversion with XMP (Dublin Core) metadata.

PDF/A-2b ("basic") requires, among other things: embedded fonts, an output
intent with an ICC profile for device colour, XMP metadata that matches the
document info dictionary, and no encryption, JavaScript or LZW compression.

We add the output intent and metadata ourselves and run a preflight for known
blockers. The PDF/A identification is written only for PDFs LibraDigit
generated itself (OCR output, image conversions, placeholders) and only when
the preflight passes; the test suite validates those with veraPDF. Imported
born-digital PDFs keep their metadata but are not labelled PDF/A, because they
can break rules a preflight cannot see.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
import shutil

try:
    import pikepdf
    PIKEPDF_AVAILABLE = True
except ImportError:
    pikepdf = None
    PIKEPDF_AVAILABLE = False

from PIL import ImageCms

PDFA_PART = '2'
PDFA_CONFORMANCE = 'B'
SRGB_ID = 'sRGB IEC61966-2.1'
_FORBIDDEN_FILTERS = {'/LZWDecode'}

_srgb_profile = None


def _srgb_icc():
    global _srgb_profile
    if _srgb_profile is None:
        _srgb_profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
    return _srgb_profile


@dataclass
class PdfAResult:
    conformant: bool
    issues: list = field(default_factory=list)

    @property
    def label(self):
        return f'PDF/A-{PDFA_PART}{PDFA_CONFORMANCE.lower()}' if self.conformant else 'PDF'

    def as_dict(self):
        return {'conformance': self.label, 'pdfa': self.conformant, 'issues': self.issues}


def _filters(obj):
    value = obj.get('/Filter')
    if value is None:
        return set()
    if pikepdf and isinstance(value, pikepdf.Array):
        return {str(v) for v in value}
    return {str(value)}


def _font_is_embedded(font):
    subtype = str(font.get('/Subtype', ''))
    if subtype == '/Type3':
        return True  # glyphs are drawn by content streams in the file
    if subtype == '/Type0':
        descendants = font.get('/DescendantFonts')
        if not descendants:
            return False
        font = descendants[0]
    descriptor = font.get('/FontDescriptor')
    if descriptor is None:
        return False
    return any(k in descriptor for k in ('/FontFile', '/FontFile2', '/FontFile3'))


def _walk_resources(resources, seen, issues):
    """Inspect fonts, images and nested forms reachable from a resource dictionary."""
    if resources is None:
        return
    if resources.is_indirect:
        if resources.objgen in seen:
            return
        seen.add(resources.objgen)

    for name, font in (resources.get('/Font') or {}).items():
        if not _font_is_embedded(font):
            base = str(font.get('/BaseFont', name)).lstrip('/')
            issues.add(f'Font not embedded: {base}')

    for _name, xobj in (resources.get('/XObject') or {}).items():
        subtype = str(xobj.get('/Subtype', ''))
        if _filters(xobj) & _FORBIDDEN_FILTERS:
            issues.add('LZW compression is not allowed in PDF/A')
        if subtype == '/Image':
            cs = xobj.get('/ColorSpace')
            if cs is not None and str(cs) == '/DeviceCMYK':
                issues.add('CMYK images need a CMYK output intent')
        elif subtype == '/Form':
            _walk_resources(xobj.get('/Resources'), seen, issues)


def _page_resources(page):
    """/Resources may be inherited from an ancestor in the page tree."""
    node, depth = page, 0
    while node is not None and depth < 64:
        if '/Resources' in node:
            return node.Resources
        node = node.get('/Parent')
        depth += 1
    return None


def preflight(pdf):
    """Return a list of problems that prevent PDF/A-2b conformance."""
    issues = set()
    if pdf.is_encrypted:
        issues.add('Encrypted PDFs cannot be PDF/A')
    names = pdf.Root.get('/Names')
    if names is not None and '/JavaScript' in names:
        issues.add('Document contains JavaScript')
    open_action = pdf.Root.get('/OpenAction')
    if isinstance(open_action, pikepdf.Dictionary) and str(open_action.get('/S', '')) == '/JavaScript':
        issues.add('Document contains JavaScript')
    seen = set()
    for page in pdf.pages:
        _walk_resources(_page_resources(page.obj), seen, issues)
        for content in ([page.obj.Contents] if '/Contents' in page.obj else []):
            streams = content if isinstance(content, pikepdf.Array) else [content]
            for stream in streams:
                if _filters(stream) & _FORBIDDEN_FILTERS:
                    issues.add('LZW compression is not allowed in PDF/A')
    return sorted(issues)


def _set_output_intent(pdf):
    icc = pikepdf.Stream(pdf, _srgb_icc())
    icc['/N'] = 3
    pdf.Root.OutputIntents = pikepdf.Array([pikepdf.Dictionary(
        Type=pikepdf.Name.OutputIntent,
        S=pikepdf.Name.GTS_PDFA1,
        OutputConditionIdentifier=SRGB_ID,
        Info=SRGB_ID,
        DestOutputProfile=icc,
    )])


def _keywords(text):
    return [k.strip() for k in (text or '').replace(';', ',').split(',') if k.strip()]


IMPORTED_PDF_ISSUE = ('Imported PDF: PDF/A conformance cannot be verified automatically, '
                      'so the file is archived as a standard PDF')


def convert_to_pdfa(src_path, dst_path, metadata, generated=True):
    """
    Write dst_path as PDF/A-2b when possible, otherwise as a plain PDF with the
    same XMP metadata. metadata keys: title, author, subject, keywords,
    description, language, publisher. Returns a PdfAResult.

    generated=False marks a PDF the user imported. Those can break PDF/A rules
    the preflight cannot detect, so they are never labelled PDF/A.
    """
    if not PIKEPDF_AVAILABLE:
        shutil.copy2(src_path, dst_path)
        return PdfAResult(False, ['pikepdf is not installed; archived as plain PDF'])

    now = datetime.now(timezone.utc).replace(microsecond=0)
    with pikepdf.open(src_path) as pdf:
        issues = preflight(pdf)
        if not generated:
            issues = [IMPORTED_PDF_ISSUE, *issues]
        conformant = not issues

        if conformant:
            _set_output_intent(pdf)
        # Strip the info dictionary first so XMP and /Info are rebuilt in sync.
        for key in list(pdf.docinfo.keys()):
            del pdf.docinfo[key]

        with pdf.open_metadata(set_pikepdf_as_editor=False, update_docinfo=True) as meta:
            if metadata.get('title'):
                meta['dc:title'] = metadata['title']
            if metadata.get('author'):
                meta['dc:creator'] = [metadata['author']]
            if metadata.get('subject') or metadata.get('description'):
                meta['dc:description'] = metadata.get('description') or metadata['subject']
            keywords = _keywords(metadata.get('keywords'))
            if keywords:
                meta['dc:subject'] = keywords
                meta['pdf:Keywords'] = ', '.join(keywords)
            if metadata.get('language'):
                meta['dc:language'] = [metadata['language']]
            if metadata.get('publisher'):
                meta['dc:publisher'] = [metadata['publisher']]
            meta['xmp:CreatorTool'] = 'LibraDigit AI'
            meta['pdf:Producer'] = 'LibraDigit AI'
            meta['xmp:CreateDate'] = now.isoformat()
            meta['xmp:ModifyDate'] = now.isoformat()
            meta['xmp:MetadataDate'] = now.isoformat()
            if conformant:
                meta['pdfaid:part'] = PDFA_PART
                meta['pdfaid:conformance'] = PDFA_CONFORMANCE

        pdf.save(dst_path, fix_metadata_version=True)
    return PdfAResult(conformant, issues)
