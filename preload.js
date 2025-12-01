const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSchedules: (data) => ipcRenderer.invoke('save-schedules', data),
  loadSchedules: () => ipcRenderer.invoke('load-schedules'),
  showNotification: (title, body) => new Notification(title, { body }),
});