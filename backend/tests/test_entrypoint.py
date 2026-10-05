"""The real server.py entrypoint, started the way the Electron shell starts it."""
import json
import os
import subprocess
import sys
import time
import urllib.request

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 5098


def test_server_starts_with_legacy_windows_encoding_and_piped_output(tmp_path):
    # Electron pipes stdout; on Windows that means cp1252, which cannot encode
    # the emoji in the startup banner and used to crash the backend.
    env = {
        **os.environ,
        'PYTHONIOENCODING': 'cp1252',
        'LIBRADIGIT_PORT': str(PORT),
        'LIBRADIGIT_DATABASE': str(tmp_path / 'db.sqlite'),
        'LIBRADIGIT_UPLOAD_FOLDER': str(tmp_path / 'uploads'),
        'LIBRADIGIT_ARCHIVE_FOLDER': str(tmp_path / 'Archive'),
    }
    proc = subprocess.Popen([sys.executable, 'server.py'], cwd=BACKEND_DIR, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    try:
        health = None
        deadline = time.time() + 30
        while time.time() < deadline and proc.poll() is None:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/api/health', timeout=1) as res:
                    health = json.load(res)
                    break
            except OSError:
                time.sleep(0.3)
        if health is None:
            proc.kill()
            output = proc.communicate(timeout=10)[0].decode('utf-8', 'replace')
            raise AssertionError(f'backend did not start (exit {proc.returncode}):\n{output[-2000:]}')
        assert health['status'] == 'healthy'
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=10)
