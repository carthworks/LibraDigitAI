"""
Background job queue for long-running OCR work.

A job row records status, progress and the final result, so the UI can poll
it, survive navigation and see what happened after a restart. Workers are
plain threads pulling job ids from an in-process queue.
"""
import json
import queue
import threading
import time

from .db import connect

ACTIVE_STATUSES = ('queued', 'running')
TERMINAL_STATUSES = ('completed', 'failed', 'cancelled')
_PROGRESS_WRITE_INTERVAL = 0.3  # seconds between progress row updates


class JobCancelled(BaseException):  # noqa: N818
    """
    Raised from a progress callback to abort a task.

    Deriving from BaseException lets it pass through the broad
    `except Exception` handlers inside the OCR code.
    """


class JobConflict(Exception):
    """The project already has an active job."""

    def __init__(self, job):
        super().__init__('This document is already being processed')
        self.job = job


def _row_to_job(row):
    if row is None:
        return None
    job = dict(row)
    for key in ('params', 'result'):
        job[key] = json.loads(job[key]) if job.get(key) else None
    return job


class JobManager:
    def __init__(self, app, tasks, workers=1):
        self.app = app
        self.tasks = tasks
        self.database = app.config['DATABASE']
        self._queue = queue.Queue()
        self._cancel_requested = set()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._threads = []
        self._workers = workers

    # ---- lifecycle -------------------------------------------------------

    def start(self):
        """Recover jobs from a previous run and start the worker threads."""
        conn = connect(self.database)
        try:
            conn.execute("""
                UPDATE jobs SET status = 'failed', error = 'Interrupted because the application closed',
                       finished_at = CURRENT_TIMESTAMP
                WHERE status = 'running'""")
            queued = [r['id'] for r in conn.execute("SELECT id FROM jobs WHERE status = 'queued' ORDER BY id")]
            conn.commit()
        finally:
            conn.close()
        for job_id in queued:
            self._queue.put(job_id)
        for i in range(self._workers):
            thread = threading.Thread(target=self._worker, name=f'job-worker-{i}', daemon=True)
            thread.start()
            self._threads.append(thread)

    def shutdown(self):
        self._stop.set()

    # ---- public API ------------------------------------------------------

    def submit(self, kind, project_id, params=None):
        if kind not in self.tasks:
            raise ValueError(f'Unknown job kind: {kind}')
        with self._lock:
            conn = connect(self.database)
            try:
                active = conn.execute(
                    f"SELECT * FROM jobs WHERE project_id = ? AND status IN {ACTIVE_STATUSES} ORDER BY id LIMIT 1",
                    (project_id,)).fetchone()
                if active:
                    raise JobConflict(_row_to_job(active))
                cur = conn.execute(
                    "INSERT INTO jobs (kind, project_id, status, message, params) VALUES (?, ?, 'queued', ?, ?)",
                    (kind, project_id, 'Waiting to start', json.dumps(params or {})))
                job_id = cur.lastrowid
                conn.commit()
            finally:
                conn.close()
        self._queue.put(job_id)
        return self.get(job_id)

    def get(self, job_id):
        conn = connect(self.database)
        try:
            return _row_to_job(conn.execute('SELECT * FROM jobs WHERE id = ?', (job_id,)).fetchone())
        finally:
            conn.close()

    def list(self, project_id=None, active_only=False, limit=50):
        where, params = [], []
        if project_id is not None:
            where.append('project_id = ?')
            params.append(project_id)
        if active_only:
            where.append(f'status IN {ACTIVE_STATUSES}')
        sql = 'SELECT * FROM jobs' + (' WHERE ' + ' AND '.join(where) if where else '') + ' ORDER BY id DESC LIMIT ?'
        conn = connect(self.database)
        try:
            return [_row_to_job(r) for r in conn.execute(sql, (*params, limit))]
        finally:
            conn.close()

    def cancel(self, job_id):
        """Cancel a queued job immediately, or ask a running one to stop at its next checkpoint."""
        conn = connect(self.database)
        try:
            row = conn.execute('SELECT status FROM jobs WHERE id = ?', (job_id,)).fetchone()
            if row is None:
                return None
            if row['status'] == 'queued':
                conn.execute("""UPDATE jobs SET status = 'cancelled', message = 'Cancelled',
                                finished_at = CURRENT_TIMESTAMP WHERE id = ?""", (job_id,))
            elif row['status'] == 'running':
                self._cancel_requested.add(job_id)
                conn.execute("UPDATE jobs SET message = 'Cancelling…' WHERE id = ?", (job_id,))
            conn.commit()
        finally:
            conn.close()
        return self.get(job_id)

    # ---- worker ----------------------------------------------------------

    def _worker(self):
        while not self._stop.is_set():
            try:
                job_id = self._queue.get(timeout=1)
            except queue.Empty:
                continue
            try:
                with self.app.app_context():
                    self._run(job_id)
            except Exception:
                self.app.logger.exception('Job %s crashed the worker loop', job_id)
            finally:
                self._queue.task_done()

    def _update(self, job_id, **fields):
        assignments = ', '.join(f'{k} = ?' for k in fields)
        conn = connect(self.database)
        try:
            conn.execute(f'UPDATE jobs SET {assignments} WHERE id = ?', (*fields.values(), job_id))
            conn.commit()
        finally:
            conn.close()

    def _run(self, job_id):
        conn = connect(self.database)
        try:
            # Claim the job atomically; a cancelled-while-queued job is skipped.
            claimed = conn.execute("""
                UPDATE jobs SET status = 'running', started_at = CURRENT_TIMESTAMP, message = 'Starting'
                WHERE id = ? AND status = 'queued'""", (job_id,)).rowcount
            conn.commit()
            row = conn.execute('SELECT * FROM jobs WHERE id = ?', (job_id,)).fetchone()
        finally:
            conn.close()
        if not claimed:
            return

        job = _row_to_job(row)
        last_write = [0.0]

        def progress(current, total, message):
            if job_id in self._cancel_requested:
                raise JobCancelled()
            now = time.monotonic()
            if now - last_write[0] < _PROGRESS_WRITE_INTERVAL and current not in (0, total):
                return
            last_write[0] = now
            pct = round(100.0 * current / total, 1) if total else 0.0
            # Leave headroom: 100% is only reported once results are saved.
            self._update(job_id, current=current, total=total, progress=min(pct, 99.0), message=message)

        try:
            result = self.tasks[job['kind']](job['project_id'], job['params'] or {}, progress)
        except JobCancelled:
            self._update(job_id, status='cancelled', message='Cancelled', finished_at=_now_sql())
        except Exception as e:
            from .services.ocr_tasks import TaskError
            message = str(e) if isinstance(e, (TaskError, ValueError)) else f'Unexpected error: {e.__class__.__name__}'
            if not isinstance(e, (TaskError, ValueError)):
                self.app.logger.exception('Job %s failed', job_id)
            self._update(job_id, status='failed', error=message, message='Failed', finished_at=_now_sql())
        else:
            self._update(job_id, status='completed', progress=100.0, message='Completed',
                         result=json.dumps(result), finished_at=_now_sql())
        finally:
            self._cancel_requested.discard(job_id)


def _now_sql():
    return time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())
