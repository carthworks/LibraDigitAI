"""
One-off data migrations that run at startup.
"""
import logging
import os
import shutil
import sqlite3

log = logging.getLogger(__name__)

# (table, column) pairs that store absolute file paths.
_PATH_COLUMNS = (
    ('projects', 'filepath'),
    ('files', 'original_path'),
    ('files', 'ocr_path'),
    ('files', 'cleaned_path'),
    ('files', 'final_path'),
)


def migrate_legacy_data(legacy_dir, database, upload_folder, archive_folder):
    """
    Move data from an old install that kept everything next to the executable.

    Copies the database, uploads and default archive into the new locations and
    rewrites the stored absolute paths. Runs only when the new database does not
    exist yet, so it is safe to call on every start. Returns True if migrated.
    """
    if not legacy_dir or os.path.exists(database):
        return False
    legacy_db = os.path.join(legacy_dir, 'libradigit.db')
    if not os.path.isfile(legacy_db):
        return False

    log.info('Migrating legacy data from %s', legacy_dir)
    os.makedirs(os.path.dirname(database) or '.', exist_ok=True)
    legacy_uploads = os.path.join(legacy_dir, 'uploads')
    legacy_archive = os.path.join(legacy_dir, 'Archive')
    for src, dst in ((legacy_uploads, upload_folder), (legacy_archive, archive_folder)):
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)

    # Copy to a temp name first so a crash mid-way leaves no half-migrated DB.
    temp_db = database + '.migrating'
    src_conn = sqlite3.connect(legacy_db)
    dst_conn = sqlite3.connect(temp_db)
    try:
        src_conn.backup(dst_conn)
        replacements = (
            (os.path.join(legacy_uploads, ''), os.path.join(upload_folder, '')),
            (os.path.join(legacy_archive, ''), os.path.join(archive_folder, '')),
        )
        for table, column in _PATH_COLUMNS:
            for old, new in replacements:
                dst_conn.execute(
                    f'UPDATE {table} SET {column} = ? || substr({column}, ?) WHERE substr({column}, 1, ?) = ?',
                    (new, len(old) + 1, len(old), old),
                )
        # A custom archive location that pointed at the old default follows it.
        dst_conn.execute(
            "UPDATE app_config SET value = ? WHERE key = 'archive_storage_path' AND value IN (?, ?)",
            (archive_folder, legacy_archive, os.path.join(legacy_archive, '')),
        )
        dst_conn.commit()
    except sqlite3.OperationalError:
        # Tables may be missing in very old databases; keep whatever was copied.
        dst_conn.commit()
    finally:
        src_conn.close()
        dst_conn.close()
    os.replace(temp_db, database)
    log.info('Legacy data migrated')
    return True
