const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openExternal: (url) => shell.openExternal(url),
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory')
});
