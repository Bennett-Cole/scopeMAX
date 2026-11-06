const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('scope', {
  getConfig: () => ipcRenderer.invoke('scope:config:get'),
  saveConfig: (config) => ipcRenderer.invoke('scope:config:save', config),
  getScreens: () => ipcRenderer.invoke('scope:capture:screens'),
  copy: (text) => ipcRenderer.invoke('scope:clipboard:copy', text),
  ask: (args) => ipcRenderer.invoke('scope:gemini:ask', args),
  onDelta: (callback) => { const handler = (_event, delta) => callback(delta); ipcRenderer.on('scope:gemini:delta', handler); return () => ipcRenderer.removeListener('scope:gemini:delta', handler); },
  minimize: () => ipcRenderer.send('scope:window:minimize'),
  close: () => ipcRenderer.send('scope:window:close')
});
