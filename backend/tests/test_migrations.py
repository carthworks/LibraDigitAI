"""Upgrading from an install that kept data next to the executable."""
import os

from conftest import upload

from app import create_app


def test_legacy_install_data_is_moved_and_paths_rewritten(tmp_path):
    legacy = tmp_path / 'legacy'
    old_app = create_app({
        'TESTING': True,
        'DATABASE': str(legacy / 'libradigit.db'),
        'UPLOAD_FOLDER': str(legacy / 'uploads'),
        'ARCHIVE_FOLDER': str(legacy / 'Archive'),
        'API_TOKEN': None,
        'LEGACY_DATA_DIR': None,
    })
    client = old_app.test_client()
    pid = upload(client, 'old.pdf', b'%PDF-1.4 legacy').get_json()['project']['id']
    client.post(f'/api/metadata/{pid}', json={'title': 'Legacy Report'})
    client.post('/api/settings', json={'archive_storage_path': str(legacy / 'Archive')})

    data = tmp_path / 'userdata'
    new_config = {
        'TESTING': True,
        'DATABASE': str(data / 'libradigit.db'),
        'UPLOAD_FOLDER': str(data / 'uploads'),
        'ARCHIVE_FOLDER': str(data / 'Archive'),
        'API_TOKEN': None,
        'LEGACY_DATA_DIR': str(legacy),
    }
    new = create_app(new_config).test_client()

    project = new.get(f'/api/projects/{pid}').get_json()['project']
    assert project['filepath'].startswith(str(data / 'uploads'))
    assert os.path.exists(project['filepath'])
    assert new.get(f'/api/projects/{pid}/file').data == b'%PDF-1.4 legacy'
    assert new.get('/api/search?q=Legacy').get_json()['count'] == 1
    assert new.get('/api/settings').get_json()['archive_storage_path'] == str(data / 'Archive')

    # Second start must not re-run the migration over newer data.
    new.post(f'/api/metadata/{pid}', json={'title': 'Renamed'})
    again = create_app(new_config).test_client()
    assert again.get(f'/api/projects/{pid}').get_json()['project']['metadata']['title'] == 'Renamed'


def test_no_legacy_dir_is_a_noop(make_app, tmp_path):
    app = make_app(LEGACY_DATA_DIR=str(tmp_path / 'does-not-exist'))
    assert app.test_client().get('/api/projects').get_json() == {'projects': []}
