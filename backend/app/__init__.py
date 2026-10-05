"""
LibraDigit AI backend application factory.

Layout:
    config.py        environment-driven settings
    db.py            SQLite connection, schema and app_config store
    security.py      request guard, upload/path safety, input validation
    search_index.py  FTS5 index maintenance and query building
    services/        domain logic (OCR, archive packaging, projects)
    routes/          Flask blueprints, one per API area
    processors/      OCR / PDF / metadata engines
"""
import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from . import search_index
from .config import Config
from .db import init_db
from .security import TOKEN_HEADER, ValidationError, api_guard


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if overrides:
        app.config.update(overrides)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['ARCHIVE_FOLDER'], exist_ok=True)

    # With a token configured (desktop build) the token is the access control and the
    # UI is served from file:// (Origin: null), so CORS may be open. Otherwise only
    # the known UI origins may read responses.
    origins = '*' if app.config['API_TOKEN'] else list(app.config['ALLOWED_ORIGINS'])
    CORS(app, origins=origins, allow_headers=['Content-Type', TOKEN_HEADER])
    app.before_request(api_guard)
    _register_error_handlers(app)

    from .routes import batch, documents, ocr, projects, system
    for module in (projects, ocr, documents, batch, system):
        app.register_blueprint(module.bp)

    with app.app_context():
        init_db()
        search_index.ensure_built()

    if not app.debug:
        logging.basicConfig(level=logging.INFO)
    return app


def _register_error_handlers(app):
    @app.errorhandler(ValidationError)
    def validation_error(e):
        return jsonify({'error': str(e)}), 400

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify({'error': e.description}), e.code

    @app.errorhandler(Exception)
    def unhandled(e):
        # Full detail goes to the log only, never to the client.
        app.logger.exception('Unhandled error')
        return jsonify({'error': f'Internal server error: {e.__class__.__name__}'}), 500
