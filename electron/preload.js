const { contextBridge, ipcRenderer } = require('electron');

console.log('DEBUG: Preload script running');


contextBridge.exposeInMainWorld('electron', {
    readData: () => ipcRenderer.invoke('read-data'),
    writeData: (data) => ipcRenderer.invoke('write-data', data),
    print: () => ipcRenderer.invoke('print'),
    savePdf: (options) => ipcRenderer.invoke('save-pdf', options),
    saveMultiplePdfs: (files) => ipcRenderer.invoke('save-multiple-pdfs', files),
    generatePDF: (payload, type) => ipcRenderer.invoke('generate-pdf', { payload, type }),
    onReceiveData: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('print-data', subscription);
        return () => {
            ipcRenderer.removeListener('print-data', subscription);
        };
    }
});
