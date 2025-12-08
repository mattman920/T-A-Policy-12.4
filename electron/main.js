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

// Generate PDF Handler (Hidden Window)
ipcMain.handle('generate-pdf', async (event, { payload, type }) => {
    const win = BrowserWindow.fromWebContents(event.sender); // Parent window

    // Determine route based on type
    let route = '';
    if (type === 'health-check') {
        route = '/print/health-check';
    } else {
        return { success: false, error: 'Unknown report type' };
    }

    // Create hidden window
    const hiddenWin = new BrowserWindow({
        show: false,
        width: 794, // 210mm approx at 96dpi (A4 width)
        height: 1123, // 297mm approx
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    const isDev = !app.isPackaged;
    const loadUrl = isDev
        ? `http://localhost:5173/#${route}`
        : `file://${path.join(__dirname, '../dist/index.html')}#${route}`;

    console.log(`[PDF] Loading hidden window: ${loadUrl}`);

    try {
        await hiddenWin.loadURL(loadUrl);

        // Wait for connection/render
        // Send data
        console.log('[PDF] Page loaded, sending data...');
        hiddenWin.webContents.send('print-data', payload);

        // Give React a moment to render state (can use ipc acknowledgment but delay is easier for v1)
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('[PDF] Printing...');
        const pdfData = await hiddenWin.webContents.printToPDF({
            printBackground: true,
            landscape: false,
            pageSize: 'A4',
            margins: { top: 0, bottom: 0, left: 0, right: 0 } // handled by CSS padding
        });

        // Prompt user to save
        const { dialog } = require('electron');
        const defaultName = payload.aiContext.name
            ? `${payload.aiContext.name.replace(/\s+/g, '_')}_HealthCheck.pdf`
            : 'HealthCheck.pdf';

        const saveResult = await dialog.showSaveDialog(win, {
            title: 'Save PDF',
            defaultPath: defaultName,
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });

        if (!saveResult.canceled) {
            fs.writeFileSync(saveResult.filePath, pdfData);
            hiddenWin.close();
            return { success: true, filePath: saveResult.filePath };
        } else {
            hiddenWin.close();
            return { success: false, canceled: true };
        }

    } catch (error) {
        console.error('[PDF] Error generating PDF:', error);
        if (!hiddenWin.isDestroyed()) hiddenWin.close();
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

// Save Multiple PDFs handler
ipcMain.handle('save-multiple-pdfs', async (event, files) => {
    const { dialog } = require('electron');
    const win = BrowserWindow.fromWebContents(event.sender);

    // 1. Select Directory
    const result = await dialog.showOpenDialog(win, {
        title: 'Select Folder to Save Reports',
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
    }

    const outputDir = result.filePaths[0];
    const results = [];

    // 2. Write each file
    for (const file of files) {
        try {
            const filePath = path.join(outputDir, file.fileName);
            fs.writeFileSync(filePath, Buffer.from(file.pdfData, 'base64'));
            results.push({ fileName: file.fileName, success: true });
        } catch (error) {
            console.error(`Error saving ${file.fileName}:`, error);
            results.push({ fileName: file.fileName, success: false, error: error.message });
        }
    }

    return { success: true, results, outputDir };
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
            plugins: true // Enable plugins for PDF viewer
        },
    });

    // Content Security Policy (CSP)
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com https://unpkg.com http://localhost:8888 http://localhost:5173 ws://localhost:5173; object-src 'self' blob:;"
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
