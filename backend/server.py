"""
LibraDigit AI backend entrypoint.

Run with `python server.py`. The application itself lives in the `app`
package; this file stays here so PyInstaller (server.spec), run-app.bat and
the Electron shell keep working unchanged.
"""
import sys
from datetime import datetime

# On Windows, stdout/stderr use the legacy code page (cp1252) when they are a
# pipe, as when Electron launches the packaged backend. Printing any emoji
# (startup banner, OCR progress messages) then raises UnicodeEncodeError and
# kills the server, so force UTF-8 before anything else is imported.
for _stream in (sys.stdout, sys.stderr):
    if _stream is not None and hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

from app import create_app  # noqa: E402
from app.services.ocr import tesseract_available  # noqa: E402

app = create_app()

if __name__ == '__main__':
    cfg = app.config
    print('🚀 LibraDigit AI Backend Server')
    print('🔍 Tesseract OCR:', '✓ Available' if tesseract_available() else '✗ Not found')
    print(f"🌐 Server running on http://{cfg['HOST']}:{cfg['PORT']}")
    print('🔐 API token required' if cfg['API_TOKEN'] else f"🔐 Allowed origins: {', '.join(cfg['ALLOWED_ORIGINS'])}")
    print('📅 Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    app.run(host=cfg['HOST'], port=cfg['PORT'], debug=cfg['DEBUG'], threaded=True)
