import io
import os
import shutil
import sys

import pytest
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402

ALLOWED_ORIGIN = 'http://localhost:3000'
requires_tesseract = pytest.mark.skipif(shutil.which('tesseract') is None, reason='Tesseract not installed')


@pytest.fixture
def make_app(tmp_path):
    def factory(**overrides):
        config = {
            'TESTING': True,
            'DATABASE': str(tmp_path / 'test.db'),
            'UPLOAD_FOLDER': str(tmp_path / 'uploads'),
            'ARCHIVE_FOLDER': str(tmp_path / 'Archive'),
            'API_TOKEN': None,
            'ALLOWED_ORIGINS': (ALLOWED_ORIGIN,),
            'TRANSLATION_ENABLED': True,
        }
        config.update(overrides)
        return create_app(config)
    return factory


@pytest.fixture
def app(make_app):
    return make_app()


@pytest.fixture
def client(app):
    return app.test_client()


def text_image_bytes(lines, fmt='PNG'):
    img = Image.new('RGB', (1600, 120 + 70 * len(lines)), 'white')
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 40)
    except OSError:
        font = ImageFont.load_default()
    for i, line in enumerate(lines):
        draw.text((60, 60 + 70 * i), line, fill='black', font=font)
    buf = io.BytesIO()
    img.save(buf, fmt)
    buf.seek(0)
    return buf


def upload(client, name, data=b'%PDF-1.4 test', **headers):
    payload = data if hasattr(data, 'read') else io.BytesIO(data)
    return client.post('/api/projects', data={'file': (payload, name)},
                       content_type='multipart/form-data', headers=headers)
