export class ScheduleManager {
  constructor() {
    this.schedules = [];
  }

  setSchedules(schedules) {
    this.schedules = schedules;
  }

  addSchedule(schedule) {
    this.schedules.push(schedule);
  }

  deleteSchedule(id) {
    this.schedules = this.schedules.filter(s => s.id !== id);
  }

  editSchedule(id, newData) {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.schedules[idx] = { ...this.schedules[idx], ...newData };
    }
  }

  getSchedulesByDate(dateString) {
    return this.schedules.filter(s => s.date === dateString);
  }

  getAllSchedules() {
    return this.schedules;
  }
}