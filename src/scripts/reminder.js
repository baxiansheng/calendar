export class ReminderService {
  constructor(scheduleManager) {
    this.scheduleManager = scheduleManager;
    this.checkInterval = setInterval(() => this.checkReminders(), 60_000); // 每分钟检查
    // 立即检查一次（避免错过刚启动时的提醒）
    setTimeout(() => this.checkReminders(), 1000);
  }

  checkReminders() {
    const now = new Date();
    const schedules = this.scheduleManager.getAllSchedules();

    schedules.forEach(s => {
      if (s.reminder == null) return;

      const [year, month, day] = s.date.split('-').map(Number);
      const [hour, minute] = s.time.split(':').map(Number);
      const eventTime = new Date(year, month - 1, day, hour, minute);

      const diffMs = eventTime - now;
      const diffMin = Math.floor(diffMs / 60_000);

      // 提前指定分钟提醒，且事件未过期
      if (diffMin === parseInt(s.reminder) && diffMs > 0) {
        window.electronAPI.showNotification(
          `⏰ 提醒：${s.title}`,
          s.description || '即将开始'
        );
      }
    });
  }

  destroy() {
    clearInterval(this.checkInterval);
  }
}