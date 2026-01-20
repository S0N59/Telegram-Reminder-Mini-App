export type Language = 'en' | 'ru';

interface Translation {
  appTitle: string;
  settingsTitle: string;
  languageLabel: string;
  accentColorLabel: string;
  closeButton: string;
  newReminderTitle: string;
  editReminderTitle: string;
  reminderTextLabel: string;
  reminderTextPlaceholder: string;
  dateLabel: string;
  yearLabel: string;
  monthLabel: string;
  dayLabel: string;
  timeLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  createReminderButton: string;
  updateReminderButton: string;
  cancelEditButton: string;
  confirmRequiredLabel: string;
  confirmRequiredHint: string;
  reRemindIntervalLabel: string;
  intervalMinutes: (min: number) => string;
  invalidPastDate: string;
  languageButtonLabel: string;
  languageButtonAria: string;
  nextReminderTitle: string;
  allRemindersTitle: string;
  emptyTitle: string;
  emptyHint: string;
  editAria: string;
  deleteAria: string;
  clearPassedButton: string;
  todayLabel: string;
  tomorrowLabel: string;
  daysShort: string[];
  monthsShort: string[];
  passedLabel: string;
  inDaysHours: (days: number, hours: number) => string;
  inHoursMinutes: (hours: number, minutes: number) => string;
  inMinutes: (minutes: number) => string;
}

export const translations: Record<Language, Translation> = {
  en: {
    appTitle: 'Reminders',
    settingsTitle: 'Settings',
    languageLabel: 'Language',
    accentColorLabel: 'Accent Color',
    closeButton: 'Close',
    newReminderTitle: 'New reminder',
    editReminderTitle: 'Edit reminder',
    reminderTextLabel: 'Reminder text',
    reminderTextPlaceholder: 'E.g. Call mom',
    dateLabel: 'Date (YYYY MM DD)',
    yearLabel: 'Year',
    monthLabel: 'Month',
    dayLabel: 'Day',
    timeLabel: 'Time (HH MM)',
    hoursLabel: 'Hours',
    minutesLabel: 'Minutes',
    createReminderButton: 'Create reminder',
    updateReminderButton: 'Update reminder',
    cancelEditButton: 'Cancel',
    confirmRequiredLabel: 'Confirmation required',
    confirmRequiredHint: 'Will re-remind until confirmed',
    reRemindIntervalLabel: 'Re-remind every',
    intervalMinutes: (min) => `${min} min`,
    invalidPastDate: 'You cannot pick a past date. Please choose today or a future date.',
    languageButtonLabel: 'Language',
    languageButtonAria: 'Toggle language',
    nextReminderTitle: 'Next reminder',
    allRemindersTitle: 'All reminders',
    emptyTitle: 'No reminders',
    emptyHint: 'Create your first reminder above',
    editAria: 'Edit',
    deleteAria: 'Delete',
    clearPassedButton: 'Clear passed',
    todayLabel: 'Today',
    tomorrowLabel: 'Tomorrow',
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    passedLabel: 'passed',
    inDaysHours: (days, hours) => `in ${days}d ${hours}h`,
    inHoursMinutes: (hours, minutes) => `in ${hours}h ${minutes}m`,
    inMinutes: (minutes) => `in ${minutes}m`
  },
  ru: {
    appTitle: 'Напоминания',
    settingsTitle: 'Настройки',
    languageLabel: 'Язык',
    accentColorLabel: 'Цвет акцента',
    closeButton: 'Закрыть',
    newReminderTitle: 'Новое напоминание',
    editReminderTitle: 'Редактировать',
    reminderTextLabel: 'Текст напоминания',
    reminderTextPlaceholder: 'Например: Позвонить маме',
    dateLabel: 'Дата (ГГГГ ММ ДД)',
    yearLabel: 'Год',
    monthLabel: 'Месяц',
    dayLabel: 'День',
    timeLabel: 'Время (ЧЧ ММ)',
    hoursLabel: 'Часы',
    minutesLabel: 'Минуты',
    createReminderButton: 'Создать напоминание',
    updateReminderButton: 'Сохранить',
    cancelEditButton: 'Отмена',
    confirmRequiredLabel: 'Требуется подтверждение',
    confirmRequiredHint: 'Будет напоминать пока не подтвердите',
    reRemindIntervalLabel: 'Повторять каждые',
    intervalMinutes: (min) => `${min} мин`,
    invalidPastDate: 'Нельзя выбрать прошедшую дату. Пожалуйста, выберите сегодняшнюю или будущую дату.',
    languageButtonLabel: 'Язык',
    languageButtonAria: 'Переключить язык',
    nextReminderTitle: 'Следующее напоминание',
    allRemindersTitle: 'Все напоминания',
    emptyTitle: 'Нет напоминаний',
    emptyHint: 'Создайте первое напоминание выше',
    editAria: 'Редактировать',
    deleteAria: 'Удалить',
    clearPassedButton: 'Очистить прошедшие',
    todayLabel: 'Сегодня',
    tomorrowLabel: 'Завтра',
    daysShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    monthsShort: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    passedLabel: 'прошло',
    inDaysHours: (days, hours) => `через ${days}д ${hours}ч`,
    inHoursMinutes: (hours, minutes) => `через ${hours}ч ${minutes}м`,
    inMinutes: (minutes) => `через ${minutes}м`
  }
};
