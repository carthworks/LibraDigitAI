"""
LibraDigit AI backend entrypoint.

Run with `python server.py`. The application itself lives in the `app`
package; this file stays here so PyInstaller (server.spec), run-app.bat and
the Electron shell keep working unchanged.
"""
from datetime import datetime

from app import create_app
from app.services.ocr import tesseract_available

app = create_app()

if __name__ == '__main__':
    cfg = app.config
    print('🚀 LibraDigit AI Backend Server')
    print('🔍 Tesseract OCR:', '✓ Available' if tesseract_available() else '✗ Not found')
    print(f"🌐 Server running on http://{cfg['HOST']}:{cfg['PORT']}")
    print('🔐 API token required' if cfg['API_TOKEN'] else f"🔐 Allowed origins: {', '.join(cfg['ALLOWED_ORIGINS'])}")
    print('📅 Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    app.run(host=cfg['HOST'], port=cfg['PORT'], debug=cfg['DEBUG'], threaded=True)
