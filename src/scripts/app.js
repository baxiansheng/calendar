import { ScheduleManager } from './schedule.js';
import { generateCalendar, formatDate } from './calendar.js';
import { ReminderService } from './reminder.js';

// 全局状态
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDate = new Date().toISOString().split('T')[0];
console.log(selectedDate);

let scheduleManager = new ScheduleManager();
let reminderService = null;

// DOM 元素
const calendarGrid = document.getElementById('calendar-grid');
const monthYearEl = document.getElementById('month-year');
const selectedDateEl = document.getElementById('selected-date');
const scheduleListEl = document.getElementById('schedule-list');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');
const todayBtn = document.getElementById('today-btn');
const addBtn = document.getElementById('add-schedule-btn');

// Modal
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('schedule-form');
const closeBtn = document.querySelector('.close');
const deleteBtn = document.getElementById('delete-btn');

// 初始化
async function initApp() {
  const data = await window.electronAPI.loadSchedules();
  scheduleManager.setSchedules(data.schedules || []);
  renderCalendar(currentYear, currentMonth);
  renderScheduleList(selectedDate);

  reminderService = new ReminderService(scheduleManager);

  // 绑定事件
  bindEvents();
}

// 渲染日历
function renderCalendar(year, month) {
  const gridData = generateCalendar(year, month);
  monthYearEl.textContent = `${year}年${month + 1}月`;

  // 清空日期格子（保留前7个星期标题）
  while (calendarGrid.children.length > 7) {
    calendarGrid.removeChild(calendarGrid.lastChild);
  }

  gridData.forEach(cell => {
    const cellEl = document.createElement('div');
    if (cell) {
      cellEl.className = 'day-cell';
      // 将日期数据存储在DOM元素的data属性中
      cellEl.dataset.dateString = cell.dateString;

      if (cell.isToday) cellEl.classList.add('today');
      if (cell.isWeekend) cellEl.classList.add('weekend');
      cellEl.innerHTML = `<div class="day-number">${cell.date.getDate()}</div>`;
      
      // 添加日程小圆点
      const daySchedules = scheduleManager.getSchedulesByDate(cell.dateString);
      
      if (daySchedules.length > 0) {
        const dots = daySchedules.slice(0, 3).map(s => 
          `<div class="schedule-dot" style="background:${s.color}"></div>`
        ).join('');
        cellEl.innerHTML += `<div class="schedule-dots">${dots}</div>`;
      }

      // 直接从DOM元素读取数据
      cellEl.addEventListener('click', function() {
        let selectedDate = this.dataset.dateString;  // 从DOM读取
        renderScheduleList(selectedDate);
      });
    } else {
      cellEl.className = 'empty-cell';
    }
    calendarGrid.appendChild(cellEl);
  });
}

// 渲染日程列表
function renderScheduleList(date) {
  selectedDateEl.textContent = formatDate(date) + ' 的日程';
  const schedules = scheduleManager.getSchedulesByDate(date);
  scheduleListEl.innerHTML = '';

  if (schedules.length === 0) {
    scheduleListEl.innerHTML = '<p>暂无日程</p>';
    return;
  }

  schedules.forEach(s => {
    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.style.borderLeftColor = s.color;
    item.innerHTML = `
      <h4>${s.title}</h4>
      <div class="time">${s.time}</div>
    `;
    item.addEventListener('click', () => openEditModal(s));
    scheduleListEl.appendChild(item);
  });
}

// 打开添加/编辑弹窗
function openAddModal() {
  modalTitle.textContent = '添加日程';
  form.reset();
  document.getElementById('schedule-id').value = '';
  document.getElementById('date').value = selectedDate;
  deleteBtn.classList.add('hidden');
  modal.classList.remove('hidden');
}

function openEditModal(schedule) {
  modalTitle.textContent = '编辑日程';
  document.getElementById('schedule-id').value = schedule.id;
  document.getElementById('title').value = schedule.title;
  document.getElementById('date').value = schedule.date;
  document.getElementById('time').value = schedule.time;
  document.getElementById('description').value = schedule.description || '';
  document.getElementById('reminder').value = schedule.reminder || '15';
  document.getElementById('color').value = schedule.color || '#4ecdc4';
  deleteBtn.classList.remove('hidden');
  modal.classList.remove('hidden');
}

// 保存日程
async function saveSchedule(data) {
  if (data.id) {
    scheduleManager.editSchedule(data.id, data);
  } else {
    data.id = crypto.randomUUID();
    data.createdAt = new Date().toISOString();
    scheduleManager.addSchedule(data);
  }
  await autoSave();
  renderCalendar(currentYear, currentMonth);
  renderScheduleList(selectedDate);
  closeModal();
}

// 删除日程
async function deleteSchedule(id) {
  if (confirm('确定删除此日程？')) {
    scheduleManager.deleteSchedule(id);
    await autoSave();
    renderCalendar(currentYear, currentMonth);
    renderScheduleList(selectedDate);
    closeModal();
  }
}

// 自动保存（带防抖）
let saveTimeout;
async function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await window.electronAPI.saveSchedules({
      schedules: scheduleManager.getAllSchedules(),
    });
  }, 2000);
}

// 关闭弹窗
function closeModal() {
  modal.classList.add('hidden');
}

// 导航
function navigateMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentYear--;
    currentMonth = 11;
  } else if (currentMonth > 11) {
    currentYear++;
    currentMonth = 0;
  }
  renderCalendar(currentYear, currentMonth);
}

function goToToday() {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDate = now.toISOString().split('T')[0];
  renderCalendar(currentYear, currentMonth);
  renderScheduleList(selectedDate);
}

// 绑定事件
function bindEvents() {
  prevBtn.addEventListener('click', () => navigateMonth(-1));
  nextBtn.addEventListener('click', () => navigateMonth(1));
  todayBtn.addEventListener('click', goToToday);
  addBtn.addEventListener('click', openAddModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('schedule-id').value;
    const data = {
      id: id || null,
      title: document.getElementById('title').value,
      date: document.getElementById('date').value,
      time: document.getElementById('time').value,
      description: document.getElementById('description').value,
      reminder: parseInt(document.getElementById('reminder').value),
      color: document.getElementById('color').value,
    };
    saveSchedule(data);
  });

  deleteBtn.addEventListener('click', () => {
    const id = document.getElementById('schedule-id').value;
    if (id) deleteSchedule(id);
  });

  // 快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') navigateMonth(-1);
    if (e.key === 'ArrowRight') navigateMonth(1);
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      openAddModal();
    }
  });
}

// 启动
document.addEventListener('DOMContentLoaded', initApp);