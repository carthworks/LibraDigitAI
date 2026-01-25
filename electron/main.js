const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess = null;

const PY_DIST_FOLDER = 'backend';
const PY_MODULE = 'server'; // Name of the executable

const getPythonScriptPath = () => {
    if (!app.isPackaged) {
        return path.join(__dirname, '../backend/server.py');
    }
    // In production, it's inside the resources/backend folder
    return path.join(process.resourcesPath, PY_DIST_FOLDER, PY_MODULE + '.exe');
};

const startPythonSubprocess = () => {
    if (!app.isPackaged) {
        console.log('Dev mode: Python backend should be running separately');
        return;
    }

    const script = getPythonScriptPath();
    console.log(`Starting Python backend from: ${script}`);

    if (app.isPackaged) {
        pythonProcess = spawn(script, [], {
            detached: false,
            windowsHide: true
        });
    } else {
        // Dev logic if we wanted to auto-start in dev (optional)
    }

    if (pythonProcess) {
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python: ${data}`);
        });
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });
        pythonProcess.on('close', (code) => {
            console.log(`Python backend exited with code ${code}`);
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

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
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
