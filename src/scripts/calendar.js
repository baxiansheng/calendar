export function generateCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const isToday = (d) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const grid = [];

  // 前置空白
  for (let i = 0; i < startDayOfWeek; i++) {
    grid.push(null);
  }

  // 当月日期
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    grid.push({
      date: date,
      dateString: formatDateToYYYYMMDD(date),
      isToday: isToday(date),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    });
  }

  // 补齐到 42 格
  while (grid.length < 42) grid.push(null);

  return grid;
}

export function formatDate(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// 工具函数：将 Date 对象转换为 YYYY-MM-DD 格式的字符串
function formatDateToYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}