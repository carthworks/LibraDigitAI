# Folder Selector Implementation Summary

## Overview

Added a native folder picker (Browse button) to the "Archive Storage Path" setting in the Settings page. This allows users to easily select a directory from their file system instead of typing the absolute path manually.

## Changes Made

### 1. Electron Main Process (`electron/main.js`)
- **Imported**: `ipcMain` and `dialog` from `electron`.
- **Added Handler**: Implemented `ipcMain.handle('dialog:openDirectory', ...)` to open the native system folder dialog.

### 2. Electron Preload Script (`electron/preload.js`)
- **Imported**: `ipcRenderer`.
- **Exposed API**: Added `selectFolder` function to `window.electron` which invokes the main process handler.

### 3. Settings UI (`src/pages/Settings.jsx`)
- **UI Update**: Replaced the standalone input field with a flex container holding the input and a new "Browse" button.
- **Icon**: Used `Folder` icon from `lucide-react`.
- **Logic**: Added onClick handler to call `window.electron.selectFolder()` and update the state with the selected path.
- **Validation**: Added checks to ensure the code handles non-Electron environments gracefully (showing a toast message).

## Usage

1. Go to **Settings**.
2. Locate **Archive Storage**.
3. Click the **Browse** button next to the storage path input.
4. Select a folder in the native dialog.
5. The path will automatically populate the input field.
6. Click **Save Changes** to persist the setting.

## Notes for Developer

> **IMPORTANT**: Since `electron/main.js` and `electron/preload.js` were modified, the Electron process needs to be restarted for these changes to take effect. If you are running `npm run dev`, please stop and restart it.
