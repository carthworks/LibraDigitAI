"""
Request guards and filesystem safety helpers.

The API listens on localhost, but any web page the user visits can still send
requests to localhost. These guards make sure only the LibraDigit UI can drive
it, and that request data can never steer reads or writes outside the app's
own folders.
"""
import hmac
import os
import re

from flask import current_app, jsonify, request
from werkzeug.utils import secure_filename

TOKEN_HEADER = 'X-LibraDigit-Token'
_PUBLIC_PATHS = frozenset({'/', '/api/health'})
_LANG_RE = re.compile(r'^[A-Za-z_]{2,16}(\+[A-Za-z_]{2,16}){0,5}$')


class ValidationError(ValueError):
    """Raised for bad client input; routes turn it into a 400."""


def api_guard():
    """before_request hook: token check (desktop build) or Origin allowlist (dev)."""
    if request.method == 'OPTIONS' or request.path in _PUBLIC_PATHS:
        return None

    token = current_app.config.get('API_TOKEN')
    if token:
        supplied = request.headers.get(TOKEN_HEADER, '')
        if not hmac.compare_digest(supplied.encode(), token.encode()):
            return jsonify({'error': 'Unauthorized'}), 401
        return None

    origin = request.headers.get('Origin')
    if origin and origin not in current_app.config['ALLOWED_ORIGINS']:
        return jsonify({'error': 'Origin not allowed'}), 403
    return None


def validate_language(lang, default='eng'):
    """Tesseract language spec such as 'eng' or 'eng+tam'."""
    if lang in (None, ''):
        return default
    if not isinstance(lang, str) or not _LANG_RE.match(lang):
        raise ValidationError('Invalid OCR language code')
    return lang


def display_filename(raw_name):
    """Basename of a client-supplied filename, for display only."""
    name = (raw_name or '').replace('\\', '/').rsplit('/', 1)[-1].strip()
    return name[:255] or 'document'


def safe_upload_path(raw_name, upload_folder=None):
    """
    Turn a client filename into a unique path inside the upload folder.

    Raises ValidationError for unsupported extensions.
    """
    upload_folder = upload_folder or current_app.config['UPLOAD_FOLDER']
    name = display_filename(raw_name)
    stem, ext = os.path.splitext(name)
    ext = ext.lower()
    if ext not in current_app.config['ALLOWED_UPLOAD_EXTENSIONS']:
        raise ValidationError(f'Unsupported file type: {ext or "(none)"}')

    # secure_filename drops non-ASCII characters, so keep a fallback stem.
    safe_stem = secure_filename(stem)[:120] or 'document'
    candidate = os.path.join(upload_folder, safe_stem + ext)
    counter = 1
    while os.path.exists(candidate):
        candidate = os.path.join(upload_folder, f'{safe_stem}_{counter}{ext}')
        counter += 1
    return candidate


def is_within(path, *roots):
    """True when path resolves to a location inside one of roots."""
    if not path:
        return False
    real = os.path.realpath(path)
    for root in roots:
        if not root:
            continue
        real_root = os.path.realpath(root)
        try:
            if os.path.commonpath([real, real_root]) == real_root:
                return True
        except ValueError:  # different drives on Windows
            continue
    return False
