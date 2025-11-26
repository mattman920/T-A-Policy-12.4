const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    readData: () => ipcRenderer.invoke('read-data'),
    writeData: (data) => ipcRenderer.invoke('write-data', data),
    print: () => ipcRenderer.invoke('print'),
    savePdf: (options) => ipcRenderer.invoke('save-pdf', options),
});
