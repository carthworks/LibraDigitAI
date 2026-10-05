const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Per-launch secret shared with the packaged backend. Electron adds it to
// requests itself, so page scripts never see it and other local web pages
// cannot call the API.
const API_TOKEN = crypto.randomBytes(32).toString('hex');
const BACKEND_URLS = ['http://localhost:5001/*', 'http://127.0.0.1:5001/*'];
const isBackendUrl = (url) => /^http:\/\/(localhost|127\.0\.0\.1):5001\//.test(url);
const isExternalWebUrl = (url) => /^https?:\/\//i.test(url) && !isBackendUrl(url);

let mainWindow;
let pythonProcess = null;

const PY_DIST_FOLDER = 'backend';
const PY_MODULE = 'server'; // Name of the executable

const getPythonScriptPath = () => {
    if (!app.isPackaged) {
        return path.join(__dirname, '../backend/server.py');
    }
    // In production, electron-builder copies 'backend/dist/server' to 'resources/backend'
    // Depending on PyInstaller output, it might be 'resources/backend/server/server.exe' or 'resources/backend/server.exe'

    // Check for the most common path first (nested folder from PyInstaller 'onedir' mode)
    const nestedPath = path.join(process.resourcesPath, 'backend', 'server', 'server.exe');
    // Check for flat path
    const flatPath = path.join(process.resourcesPath, 'backend', 'server.exe');
    const fs = require('fs');

    if (fs.existsSync(nestedPath)) return nestedPath;
    if (fs.existsSync(flatPath)) return flatPath;

    // Fallback logging
    console.error(`Backend not found. Checked: ${nestedPath} and ${flatPath}`);
    return flatPath;
};

const logFile = path.join(app.getPath('userData'), 'backend.log');
const fs = require('fs');

const logToFile = (message) => {
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
};

const startPythonSubprocess = () => {
    if (!app.isPackaged) {
        console.log('Dev mode: Python backend should be running separately');
        return;
    }

    const script = getPythonScriptPath();
    logToFile(`Starting Python backend from: ${script}`);

    if (app.isPackaged) {
        // Important: Set cwd to the folder containing the executable
        // This ensures relative paths in Python (if any remain) work relative to the exe
        const scriptDir = path.dirname(script);

        pythonProcess = spawn(script, [], {
            detached: false,
            windowsHide: true,
            cwd: scriptDir,
            env: { ...process.env, LIBRADIGIT_API_TOKEN: API_TOKEN }
        });
    }

    if (pythonProcess) {
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python: ${data}`);
            logToFile(`STDOUT: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
            logToFile(`STDERR: ${data}`);
        });
        pythonProcess.on('close', (code) => {
            console.log(`Python backend exited with code ${code}`);
            logToFile(`EXIT: Python backend exited with code ${code}`);
        });
        pythonProcess.on('error', (err) => {
            logToFile(`SPAWN ERROR: ${err.message}`);
        });
    }
};

const exitPythonSubprocess = () => {
    if (pythonProcess) {
        console.log('Killing Python backend...');
        pythonProcess.kill();
        pythonProcess = null;
    }
};

function createWindow() {
    // Start backend
    startPythonSubprocess();

    if (app.isPackaged) {
        session.defaultSession.webRequest.onBeforeSendHeaders({ urls: BACKEND_URLS }, (details, callback) => {
            details.requestHeaders['X-LibraDigit-Token'] = API_TOKEN;
            callback({ requestHeaders: details.requestHeaders });
        });
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true
        },
        backgroundColor: '#0a0a0f',
        titleBarStyle: 'default',
        icon: path.join(__dirname, '../public/icon.png')
    });

    // Load from Vite dev server in development
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Backend links (PDF previews/downloads) may open in-app; other web links go
    // to the system browser; everything else is refused.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (isBackendUrl(url)) return { action: 'allow' };
        if (isExternalWebUrl(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const current = mainWindow.webContents.getURL();
        const sameApp = url.startsWith('file://') || (current && new URL(url).origin === new URL(current).origin);
        if (!sameApp && !isBackendUrl(url)) {
            event.preventDefault();
            if (isExternalWebUrl(url)) shell.openExternal(url);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    exitPythonSubprocess();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    exitPythonSubprocess();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handler for Folder Selection
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});
