const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

app.whenReady().then(async () => {
  await ensureDataDir();

  const win = new BrowserWindow({
    width: 769,
    height: 549,
    transparent: true, // 启用窗口透明
    // backgroundColor: 'rgba(128, 128, 128, 0.5)', // 灰色的50%透明度背景
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    // autoHideMenuBar: true,
    icon: path.join(__dirname, "images/icon.png"),
    // frame: false
  });

  win.loadFile('src/index.html');

  // 首次启动通知（可选）
  if (Notification.isSupported()) {
    new Notification({ title: '日历启动', body: '欢迎使用桌面日历' }).show();
  }
});

// IPC handlers
ipcMain.handle('save-schedules', async (_, schedules) => {
  await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf8');
});

ipcMain.handle('load-schedules', async () => {
  try {
    const data = await fs.readFile(SCHEDULES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { schedules: [] };
  }
});