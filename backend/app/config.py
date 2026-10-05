"""
Runtime configuration.

Everything that varies between dev, tests and the packaged desktop build is
read from environment variables here, so the rest of the code never touches
os.environ directly.
"""
import os
import sys


def _base_dir():
    # PyInstaller bundles set sys.frozen; data then lives next to the executable.
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


BASE_DIR = _base_dir()

DEFAULT_ALLOWED_ORIGINS = (
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
)


class Config:
    BASE_DIR = BASE_DIR
    DATABASE = os.environ.get('LIBRADIGIT_DATABASE', os.path.join(BASE_DIR, 'libradigit.db'))
    UPLOAD_FOLDER = os.environ.get('LIBRADIGIT_UPLOAD_FOLDER', os.path.join(BASE_DIR, 'uploads'))
    ARCHIVE_FOLDER = os.environ.get('LIBRADIGIT_ARCHIVE_FOLDER', os.path.join(BASE_DIR, 'Archive'))

    # Explicit tesseract executable (the desktop build bundles its own copy).
    TESSERACT_CMD = os.environ.get('LIBRADIGIT_TESSERACT_CMD') or None
    # Folder of a pre-1.3 install whose data should be moved into the paths above.
    LEGACY_DATA_DIR = os.environ.get('LIBRADIGIT_LEGACY_DATA_DIR') or None

    HOST = os.environ.get('LIBRADIGIT_HOST', '127.0.0.1')
    PORT = int(os.environ.get('LIBRADIGIT_PORT', '5001'))
    DEBUG = _env_bool('LIBRADIGIT_DEBUG', not _env_bool('ELECTRON_BUILD', False) and not getattr(sys, 'frozen', False))

    # Shared secret injected by the Electron shell. When set, every /api request
    # must carry it in the X-LibraDigit-Token header.
    API_TOKEN = os.environ.get('LIBRADIGIT_API_TOKEN') or None

    # Browser origins allowed to call the API (comma separated).
    ALLOWED_ORIGINS = tuple(
        o.strip() for o in os.environ.get('LIBRADIGIT_ALLOWED_ORIGINS', ','.join(DEFAULT_ALLOWED_ORIGINS)).split(',')
        if o.strip()
    )

    # Upload limits
    MAX_CONTENT_LENGTH = int(os.environ.get('LIBRADIGIT_MAX_UPLOAD_MB', '200')) * 1024 * 1024
    IMAGE_EXTENSIONS = frozenset({'.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp'})
    ALLOWED_UPLOAD_EXTENSIONS = IMAGE_EXTENSIONS | {'.pdf'}

    # Outbound translation sends document text to Google; allow opting out.
    TRANSLATION_ENABLED = _env_bool('LIBRADIGIT_ENABLE_TRANSLATION', True)
    MAX_TRANSLATE_CHARS = 100_000

    SEARCH_MAX_LIMIT = 100

    # Background OCR workers. OCR is CPU-bound and Tesseract is itself
    # multi-threaded, so one or two workers is usually best.
    JOB_WORKERS = max(1, int(os.environ.get('LIBRADIGIT_JOB_WORKERS', '1')))
