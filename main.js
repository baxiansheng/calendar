const { app, BrowserWindow, ipcMain, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

// 获取用户数据目录（跨平台安全路径）
const userDataPath = path.join(app.getPath('userData'), 'data');
const todoFilePath = path.join(userDataPath, 'todo-data.json');

let secondWindow;
let win;
let winWidth, winHeight;

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

app.whenReady().then(async () => {
  await ensureDataDir();
  let { width, height } = screen.getPrimaryDisplay().workAreaSize;
  winWidth = width;
  winHeight = height;
  win = new BrowserWindow({
    x: winWidth - 769,
    y: 0,
    width: 769,
    height: 570,
    transparent: true, // 启用窗口透明
    // backgroundColor: 'rgba(128, 128, 128, 0.5)', // 灰色的50%透明度背景
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, "images/icon.png"),
    frame: false
  });

  win.loadFile('src/index.html');

  // 首次启动通知（可选）
  if (Notification.isSupported()) {
    new Notification({ title: '日历启动', body: '欢迎使用桌面日历' }).show();
  }

  // 监听渲染进程发来的 "toggle-always-on-top" 消息
  ipcMain.handle('toggle-always-on-top', (event) => {
    const current = win.isAlwaysOnTop();
    const newValue = !current;
    win.setAlwaysOnTop(newValue);
    return newValue; // 返回当前状态，方便前端更新 UI
  });

  // IPC: 开始收缩动画
  ipcMain.handle('shrink-window', async (event, targetSizeW = 100, targetSizeH = 80) => {
    if (!win) return;

    const startBounds = win.getBounds();
    const duration = 600; // 动画时长 ms
    const frames = 60;    // 帧数
    const interval = duration / frames;

    const startX = startBounds.x;
    const startY = startBounds.y;
    const startWidth = startBounds.width;
    const startHeight = startBounds.height;

    // 计算终点：窗口右上角固定？还是中心固定？
    // 这里我们让窗口**右上角不动**，左下角收缩（符合“向右上角收缩”）
    const endX = startX + startWidth - targetSizeW;
    const endY = startY;
    const endWidth = targetSizeW;
    const endHeight = targetSizeH;

    for (let i = 1; i <= frames; i++) {
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
      const progress = easeOutCubic(i / frames);
      // const progress = i / frames; // 0 → 1

      // 使用缓动函数（可选，这里用线性）
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;
      const currentWidth = startWidth - (startWidth - endWidth) * progress;
      const currentHeight = startHeight - (startHeight - endHeight) * progress;

      win.setBounds({
        x: Math.round(currentX),
        y: Math.round(currentY),
        width: Math.round(currentWidth),
        height: Math.round(currentHeight)
      });

      await new Promise(resolve => setTimeout(resolve, interval));
    }
    // 确保最终精确
    win.setBounds({ x: endX, y: endY, width: targetSizeW, height: targetSizeH });
  });

  // IPC: 恢复原始大小（可选）
  ipcMain.handle('restore-window', (event, originalBounds) => {
    const curBounds = win.getBounds();
    const curX = curBounds.x;
    const curY = curBounds.y;
    const curWidth = curBounds.width;
    const curHeight = curBounds.height;

    originalBounds = {
      x: curX - 769 + 38,
      y: curY,
      width: 769,
      height: 570,
    }
    if (win) {
      win.setBounds(originalBounds);
    }
  });

});

// 创建第二个窗口
function createSecondWindow() {
  if (secondWindow) {
    // 如果已存在，直接聚焦（避免重复创建）
    secondWindow.focus();
    return;
  }

  // 假设第二个窗口固定宽高
  const secondWidth = 300;
  const secondHeight = 570;

  // 🔑 关键：获取主窗口的位置和尺寸
  const mainBounds = win.getBounds(); // { x, y, width, height }

  // ✅ 方案1：贴在主窗口**⬅左侧，垂直居中**
  const x = mainBounds.x - secondWidth - 4; // 左侧 + 10px 间距
  const y = mainBounds.y;

  secondWindow = new BrowserWindow({
    x: x,
    y: y,
    width: secondWidth,
    height: secondHeight,
    parent: win,        // 设置父子关系（可选）
    modal: false,              // 非模态（可自由切换）
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    transparent: true, // 启用窗口透明
    autoHideMenuBar: true,
    frame: false
  });

  secondWindow.loadFile('src/todo.html');

  // 监听子窗口关闭事件，清理引用
  secondWindow.on('closed', () => {
    secondWindow = null;
  });
}

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

// IPC: 主窗口请求打开第二个窗口
ipcMain.handle('open-second-window', () => {
  if (secondWindow) {
    secondWindow.close(); // 触发 'closed' 事件，自动设为 null
    return false;
  } else {
    createSecondWindow();
    return true
  }
});

// IPC: 第二个窗口请求关闭自己
ipcMain.handle('close-second-window', () => {
  if (secondWindow) {
    secondWindow.close(); // 触发 'closed' 事件，自动设为 null
  }
});

// 确保文件存在
async function ensureTodoFile() {
  try {
    await fs.access(todoFilePath); // 如果文件存在，不报错；不存在则抛错
  } catch (err) {
    // 文件不存在，创建它
    await fs.writeFile(todoFilePath, JSON.stringify([]), 'utf8');
  }
}

// 读取 Todo 列表
async function readTodos() {
  await ensureTodoFile();
  const data = await fs.readFile(todoFilePath, 'utf8');
  return JSON.parse(data);
}

// 写入 Todo 列表
async function writeTodos(todos) {
  // await ensureTodoFile();
  await fs.writeFile(todoFilePath, JSON.stringify(todos, null, 2), 'utf8');
}

// IPC: 获取所有 todos
ipcMain.handle('get-todos', async () => {
  return await readTodos();
});

// IPC: 添加新 todo
ipcMain.handle('add-todo', async (event, text) => {
  const todos = await readTodos();
  todos.push({
    id: crypto.randomUUID(), // 简单 ID（生产环境建议用 uuid）
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString(),
    keeped: false
  });
  await writeTodos(todos);
  return todos;
});

// IPC: 切换完成状态
ipcMain.handle('toggle-todo', async (event, id) => {
  const todos = await readTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    writeTodos(todos);
  }
  return todos;
});

// IPC: 切换完成状态
ipcMain.handle('keep-todo', async (event) => {
  const todos = await readTodos();
  const completedTodos = todos.filter(t => t.completed == true && t.keeped == false);
  if (completedTodos) {
    completedTodos.forEach(t => {
      t.keeped = true;
    });
    writeTodos(todos);
  }
  return todos;
});