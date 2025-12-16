const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveSchedules: (data) => ipcRenderer.invoke('save-schedules', data),
  loadSchedules: () => ipcRenderer.invoke('load-schedules'),
  showNotification: (title, body) => new Notification(title, { body }),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  openSecondWindow: () => ipcRenderer.invoke('open-second-window'),
  closeSecondWindow: () => ipcRenderer.invoke('close-second-window'),
  shrink: (sizeW, sizeH) => ipcRenderer.invoke('shrink-window', sizeW, sizeH),
  restore: (bounds) => ipcRenderer.invoke('restore-window', bounds),
});


contextBridge.exposeInMainWorld('todoAPI', {
  getTodos: () => ipcRenderer.invoke('get-todos'),
  addTodo: (text) => ipcRenderer.invoke('add-todo', text),
  toggleTodo: (id) => ipcRenderer.invoke('toggle-todo', id),
  keepTodo: () => ipcRenderer.invoke('keep-todo'),
});