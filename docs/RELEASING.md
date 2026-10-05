# Releasing the Windows desktop app

Releases are built by GitHub Actions (`.github/workflows/release.yml`) on a clean
Windows runner. Nothing needs to be installed locally.

## Cutting a release

1. Bump `"version"` in `package.json` (for example `1.3.1`) and merge to `main`.
2. Tag the merge commit and push the tag:
   ```bash
   git tag v1.3.1
   git push origin v1.3.1
   ```
3. The workflow:
   - checks the tag matches `package.json`;
   - builds the Python backend with PyInstaller (`backend/server.spec`);
   - bundles Tesseract plus the OCR language packs (`scripts/bundle-tesseract.ps1`);
   - starts the packaged backend and checks health, token enforcement and Tesseract (`scripts/smoke-test-backend.ps1`);
   - builds the NSIS installer and uploads it to a **draft** GitHub release.
4. Test the installer from the draft release, then press **Publish**.
   Installed copies find the new version through `electron-updater` on their next start.

## Code signing (removes the SmartScreen warning)

Unsigned installers work, but Windows SmartScreen warns users. To sign:

1. Buy a code-signing certificate. An OV certificate builds SmartScreen
   reputation over time; an EV certificate is trusted immediately. As an alternative, Azure Trusted Signing is
   cheaper but needs a separate electron-builder setup.
2. Export it as a password-protected `.pfx` and base64-encode it:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | Set-Clipboard
   ```
3. Add repository secrets (Settings → Secrets and variables → Actions):
   - `WIN_CSC_LINK`: the base64 text
   - `WIN_CSC_KEY_PASSWORD`: the `.pfx` password

The release workflow signs automatically when these secrets exist. Without them,
it prints a warning and builds an unsigned installer.

## Where user data lives (packaged app)

| Data | Location |
|---|---|
| Database, working uploads | `%APPDATA%\LibraDigit AI\data\` |
| Default archive | `Documents\LibraDigit Archive\` (changeable in Settings) |
| Backend log | `%APPDATA%\LibraDigit AI\backend.log` |

Data from releases before 1.3, which was stored beside the program files, is copied
into these locations automatically on first start (`backend/app/migrations.py`).

## Building locally (optional)

```powershell
cd backend; pip install -r requirements-dev.txt; pyinstaller --noconfirm server.spec; cd ..
./scripts/bundle-tesseract.ps1
npm ci
npm run dist        # installer in release/
```
