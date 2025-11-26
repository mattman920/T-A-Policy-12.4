const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = 'attendance_data.json';

function getDataPath() {
    return path.join(app.getPath('userData'), DATA_FILE);
}

ipcMain.handle('read-data', async () => {
    const filePath = getDataPath();
    try {
        if (!fs.existsSync(filePath)) {
            return { employees: [], violations: [], quarters: [] }; // Default state
        }
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { employees: [], violations: [], quarters: [] };
    }
});

ipcMain.handle('write-data', async (event, data) => {
    const filePath = getDataPath();
    try {
        // Basic validation to ensure we aren't writing garbage
        if (!data || typeof data !== 'object' || !Array.isArray(data.employees)) {
            throw new Error('Invalid data structure');
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (error) {
        console.error('Error writing data:', error);
        return { success: false, error: error.message };
    }
});

// Print handler
ipcMain.handle('print', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return new Promise((resolve) => {
        win.webContents.print({
            silent: false,
            printBackground: true,
            margins: {
                marginType: 'default'
            }
        }, (success, errorType) => {
            if (success) {
                resolve({ success: true });
            } else {
                resolve({ success: false, error: errorType });
            }
        });
    });
});

// Save PDF handler
ipcMain.handle('save-pdf', async (event, options) => {
    const { dialog } = require('electron');
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showSaveDialog(win, {
        title: 'Save Report as PDF',
        defaultPath: options.defaultPath || 'report.pdf',
        filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
        ]
    });

    if (result.canceled) {
        return { success: false, canceled: true };
    }

    try {
        // Write the PDF buffer to the selected file
        fs.writeFileSync(result.filePath, Buffer.from(options.pdfData, 'base64'));
        return { success: true, filePath: result.filePath };
    } catch (error) {
        console.error('Error saving PDF:', error);
        return { success: false, error: error.message };
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true, // Enable sandbox for extra security
        },
    });

    // Content Security Policy (CSP)
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
                ]
            }
        });
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
