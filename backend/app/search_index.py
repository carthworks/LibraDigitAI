"""
SQLite FTS5 full-text index over project metadata and OCR text.
"""
from .db import connect

SEARCH_FIELDS = ('title', 'author', 'content', 'keywords')

_SOURCE_SQL = '''
    SELECT
        p.id,
        COALESCE(NULLIF(m.title, ''), p.filename) AS title,
        COALESCE(m.author, '') AS author,
        COALESCE(NULLIF(o.cleaned_text, ''), o.original_text, '') AS content,
        COALESCE(m.keywords, '') AS keywords
    FROM projects p
    LEFT JOIN ocr_text o ON p.id = o.project_id
    LEFT JOIN metadata m ON p.id = m.project_id
'''

_INSERT_SQL = 'INSERT INTO search_index (project_id, title, author, content, keywords) VALUES (?, ?, ?, ?, ?)'


def _with_conn(fn):
    def wrapper(*args, conn=None, **kwargs):
        if conn is not None:
            return fn(conn, *args, **kwargs)
        own = connect()
        try:
            result = fn(own, *args, **kwargs)
            own.commit()
            return result
        finally:
            own.close()
    return wrapper


@_with_conn
def rebuild(conn):
    conn.execute('DELETE FROM search_index')
    rows = conn.execute(_SOURCE_SQL + " WHERE p.status != 'upload'").fetchall()
    conn.executemany(_INSERT_SQL, [tuple(r) for r in rows])
    return len(rows)


@_with_conn
def ensure_built(conn):
    """Populate the index on first start (or after it was dropped)."""
    if conn.execute('SELECT count(*) FROM search_index').fetchone()[0] == 0:
        return rebuild(conn=conn)
    return 0


@_with_conn
def update(conn, project_id):
    conn.execute('DELETE FROM search_index WHERE project_id = ?', (project_id,))
    row = conn.execute(_SOURCE_SQL + ' WHERE p.id = ?', (project_id,)).fetchone()
    if row:
        conn.execute(_INSERT_SQL, tuple(row))


@_with_conn
def remove(conn, project_id):
    conn.execute('DELETE FROM search_index WHERE project_id = ?', (project_id,))


def _quote(term):
    return '"' + term.replace('"', '""') + '"'


def build_fts_query(query, exact=False, prefix=False, field='all'):
    """
    Build an FTS5 MATCH expression from free text.

    Every term is quoted so user input can never be parsed as FTS5 syntax
    (operators, column filters, unbalanced quotes).
    """
    terms = query.split()
    if not terms:
        return None
    if exact:
        expr = _quote(' '.join(terms))
    else:
        expr = ' '.join(_quote(t) + ('*' if prefix else '') for t in terms)
    if field in SEARCH_FIELDS:
        expr = f'{field} : ({expr})'
    return expr
