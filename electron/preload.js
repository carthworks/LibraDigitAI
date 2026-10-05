const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Only web links: file:, smb:, custom protocol handlers etc. could launch programs.
    openExternal: (url) => {
        if (typeof url === 'string' && /^(https?:|mailto:)/i.test(url)) {
            return shell.openExternal(url);
        }
        return Promise.reject(new Error('Blocked non-web URL'));
    },
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory')
});
