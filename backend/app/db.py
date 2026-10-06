"""
SQLite access: connection factory, schema bootstrap and the app_config store.
"""
import sqlite3
from contextlib import contextmanager

from flask import current_app


def connect(database_path=None):
    """Open a connection tuned for a small multi-threaded desktop server."""
    path = database_path or current_app.config['DATABASE']
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    # WAL lets the batch worker write while API requests read.
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA synchronous=NORMAL')
    conn.execute('PRAGMA busy_timeout=30000')
    return conn


@contextmanager
def transaction(database_path=None):
    """Yield a connection; commit on success, roll back on error, always close."""
    conn = connect(database_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


SCHEMA = '''
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT,
    status TEXT DEFAULT 'upload',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    original_path TEXT,
    ocr_path TEXT,
    cleaned_path TEXT,
    final_path TEXT,
    archive_format TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT,
    author TEXT,
    year TEXT,
    subject TEXT,
    keywords TEXT,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS ocr_text (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    original_text TEXT,
    cleaned_text TEXT,
    confidence_data TEXT,
    mean_confidence REAL,
    word_count INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE TABLE IF NOT EXISTS batch_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batch_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS metadata_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    suggested_title TEXT,
    suggested_author TEXT,
    suggested_year TEXT,
    suggested_subject TEXT,
    suggested_keywords TEXT,
    confidence_scores TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    project_id INTEGER,
    status TEXT NOT NULL DEFAULT 'queued',
    progress REAL NOT NULL DEFAULT 0,
    current INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    params TEXT,
    result TEXT,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
    project_id UNINDEXED, title, author, content, keywords, tokenize = 'porter'
);

CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ON batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_items_project_id ON batch_items(project_id);
CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_project_id ON metadata_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_metadata_project_id ON metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_text_project_id ON ocr_text(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);
'''


def init_db(database_path=None):
    with transaction(database_path) as conn:
        conn.executescript(SCHEMA)
        # Migration for databases created before confidence_data existed.
        columns = {row['name'] for row in conn.execute('PRAGMA table_info(ocr_text)')}
        if 'confidence_data' not in columns:
            conn.execute('ALTER TABLE ocr_text ADD COLUMN confidence_data TEXT')
        if 'mean_confidence' not in columns:
            conn.execute('ALTER TABLE ocr_text ADD COLUMN mean_confidence REAL')
        if 'word_count' not in columns:
            conn.execute('ALTER TABLE ocr_text ADD COLUMN word_count INTEGER')
        backfill_word_counts(conn)
        file_columns = {row['name'] for row in conn.execute('PRAGMA table_info(files)')}
        if 'archive_format' not in file_columns:
            conn.execute('ALTER TABLE files ADD COLUMN archive_format TEXT')


EFFECTIVE_TEXT_SQL = "COALESCE(NULLIF(cleaned_text, ''), original_text, '')"


def refresh_word_count(conn, project_id):
    """Store the word count of a project's current text (cleaned if present, else OCR)."""
    row = conn.execute(f'SELECT {EFFECTIVE_TEXT_SQL} AS text FROM ocr_text WHERE project_id = ?',
                       (project_id,)).fetchone()
    if row is not None:
        conn.execute('UPDATE ocr_text SET word_count = ? WHERE project_id = ?', (len(row['text'].split()), project_id))


def backfill_word_counts(conn, batch=200):
    """Fill word_count for rows saved before the column existed (runs once per row)."""
    while True:
        rows = conn.execute(f'''
            SELECT project_id, {EFFECTIVE_TEXT_SQL} AS text FROM ocr_text
            WHERE word_count IS NULL AND (original_text IS NOT NULL OR cleaned_text IS NOT NULL)
            LIMIT ?''', (batch,)).fetchall()
        if not rows:
            return
        conn.executemany('UPDATE ocr_text SET word_count = ? WHERE project_id = ?',
                         [(len(r['text'].split()), r['project_id']) for r in rows])


def get_config_value(key, default=None):
    with transaction() as conn:
        row = conn.execute('SELECT value FROM app_config WHERE key = ?', (key,)).fetchone()
    return row['value'] if row else default


def set_config_value(key, value):
    with transaction() as conn:
        conn.execute('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', (key, str(value)))
