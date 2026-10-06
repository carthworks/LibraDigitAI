const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Per-launch secret shared with the packaged backend. Electron adds it to
// requests itself, so page scripts never see it and other local web pages
// cannot call the API.
const API_TOKEN = crypto.randomBytes(32).toString('hex');
const BACKEND_PORT = 5001;
const BACKEND_URLS = [`http://localhost:${BACKEND_PORT}/*`, `http://127.0.0.1:${BACKEND_PORT}/*`];
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/api/health`;
const BACKEND_START_TIMEOUT_MS = 60000;
const isBackendUrl = (url) => /^http:\/\/(localhost|127\.0\.0\.1):5001\//.test(url);
const isExternalWebUrl = (url) => /^https?:\/\//i.test(url) && !isBackendUrl(url);

// Test/automation hook: isolate all app data in a given folder.
if (process.env.LIBRADIGIT_USER_DATA_DIR) {
    app.setPath('userData', process.env.LIBRADIGIT_USER_DATA_DIR);
}

let mainWindow = null;
let pythonProcess = null;
let quitting = false;

const logFile = () => path.join(app.getPath('userData'), 'backend.log');
const logToFile = (message) => {
    try {
        fs.appendFileSync(logFile(), `${new Date().toISOString()} - ${message}\n`);
    } catch {
        // Logging must never take the app down.
    }
};

const getBackendExecutable = () => {
    // electron-builder copies PyInstaller's backend/dist/server into resources/backend.
    const candidates = [
        path.join(process.resourcesPath, 'backend', 'server.exe'),
        path.join(process.resourcesPath, 'backend', 'server', 'server.exe'),
        path.join(process.resourcesPath, 'backend', 'server'),
    ];
    return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || candidates[0];
};

const getBundledTesseract = () => {
    const exe = path.join(process.resourcesPath, 'tesseract', process.platform === 'win32' ? 'tesseract.exe' : 'tesseract');
    return fs.existsSync(exe) ? exe : null;
};

const backendEnv = (backendDir) => {
    // Data lives in the user profile so it survives updates and needs no admin rights.
    const dataDir = path.join(app.getPath('userData'), 'data');
    const env = {
        ...process.env,
        LIBRADIGIT_API_TOKEN: API_TOKEN,
        LIBRADIGIT_PORT: String(BACKEND_PORT),
        LIBRADIGIT_DATABASE: path.join(dataDir, 'libradigit.db'),
        LIBRADIGIT_UPLOAD_FOLDER: path.join(dataDir, 'uploads'),
        LIBRADIGIT_ARCHIVE_FOLDER: process.env.LIBRADIGIT_ARCHIVE_FOLDER
            || path.join(app.getPath('documents'), 'LibraDigit Archive'),
        // Releases before 1.3 stored data beside the backend executable.
        LIBRADIGIT_LEGACY_DATA_DIR: backendDir,
    };
    const tesseract = getBundledTesseract();
    if (tesseract) {
        env.LIBRADIGIT_TESSERACT_CMD = tesseract;
        env.TESSDATA_PREFIX = path.join(path.dirname(tesseract), 'tessdata');
    }
    return env;
};

const startBackend = () => {
    if (!app.isPackaged) {
        console.log('Dev mode: start the backend separately (npm run dev:backend)');
        return;
    }
    const executable = getBackendExecutable();
    const cwd = path.dirname(executable);
    logToFile(`Starting backend: ${executable}`);
    pythonProcess = spawn(executable, [], { cwd, windowsHide: true, env: backendEnv(cwd) });
    pythonProcess.stdout.on('data', (data) => logToFile(`STDOUT: ${data}`));
    pythonProcess.stderr.on('data', (data) => logToFile(`STDERR: ${data}`));
    pythonProcess.on('error', (err) => logToFile(`SPAWN ERROR: ${err.message}`));
    pythonProcess.on('close', (code) => {
        logToFile(`Backend exited with code ${code}`);
        pythonProcess = null;
        if (!quitting && mainWindow) {
            dialog.showErrorBox('LibraDigit AI', `The processing engine stopped unexpectedly (code ${code}).\n\nDetails: ${logFile()}`);
        }
    });
};

const stopBackend = () => {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
};

const checkHealth = () => new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
});

const waitForBackend = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await checkHealth()) return true;
        if (app.isPackaged && !pythonProcess) return false;
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
};

const SPLASH_HTML = `<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:center;
justify-content:center;background:#0a0a0f;color:#cbd5e1;font-family:Segoe UI,system-ui,sans-serif">
<div style="text-align:center"><div style="font-size:22px;color:#fff;margin-bottom:8px">LibraDigit AI</div>
<div>Starting the processing engine…</div></div></body></html>`;

const setupAutoUpdates = () => {
    if (!app.isPackaged) return;
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.logger = { info: logToFile, warn: logToFile, error: logToFile, debug: () => {} };
        autoUpdater.checkForUpdatesAndNotify().catch((err) => logToFile(`Update check failed: ${err.message}`));
    } catch (err) {
        logToFile(`Auto-update unavailable: ${err.message}`);
    }
};

async function createWindow() {
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
        icon: path.join(__dirname, 'icon.png')
    });

    // Backend links (PDF previews/downloads) may open in-app; other web links go
    // to the system browser; everything else is refused.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (isBackendUrl(url)) return { action: 'allow' };
        if (isExternalWebUrl(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const current = mainWindow.webContents.getURL();
        let sameApp = url.startsWith('file://');
        try {
            sameApp = sameApp || (current && !current.startsWith('data:') && new URL(url).origin === new URL(current).origin);
        } catch {
            sameApp = false;
        }
        if (!sameApp && !isBackendUrl(url)) {
            event.preventDefault();
            if (isExternalWebUrl(url)) shell.openExternal(url);
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);

    const ready = await waitForBackend(app.isPackaged ? BACKEND_START_TIMEOUT_MS : 5000);
    if (!mainWindow) return;
    if (!ready && app.isPackaged) {
        dialog.showErrorBox('LibraDigit AI',
            `The processing engine did not start.\n\nPlease restart the application. Details: ${logFile()}`);
    }

    if (!app.isPackaged) {
        await mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

if (!app.requestSingleInstanceLock()) {
    // A second copy would start a second backend on the same port.
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        if (app.isPackaged) {
            session.defaultSession.webRequest.onBeforeSendHeaders({ urls: BACKEND_URLS }, (details, callback) => {
                details.requestHeaders['X-LibraDigit-Token'] = API_TOKEN;
                callback({ requestHeaders: details.requestHeaders });
            });
        }
        startBackend();
        createWindow();
        setupAutoUpdates();
    });
}

app.on('before-quit', () => {
    quitting = true;
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', stopBackend);

app.on('activate', () => {
    if (mainWindow === null && app.isReady()) {
        createWindow();
    }
});

// IPC Handler for Folder Selection
ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    return canceled ? null : filePaths[0];
});
