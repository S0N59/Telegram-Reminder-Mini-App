export type Language = 'en' | 'ru';

interface Translation {
  appTitle: string;
  newReminderTitle: string;
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
  invalidPastDate: string;
  languageButtonLabel: string;
  languageButtonAria: string;
  nextReminderTitle: string;
  allRemindersTitle: string;
  emptyTitle: string;
  emptyHint: string;
  deleteAria: string;
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
    newReminderTitle: 'New reminder',
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
    invalidPastDate: 'You cannot pick a past date. Please choose today or a future date.',
    languageButtonLabel: 'Language',
    languageButtonAria: 'Toggle language',
    nextReminderTitle: 'Next reminder',
    allRemindersTitle: 'All reminders',
    emptyTitle: 'No reminders',
    emptyHint: 'Create your first reminder above',
    deleteAria: 'Delete',
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
    newReminderTitle: 'Новое напоминание',
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
    invalidPastDate: 'Нельзя выбрать прошедшую дату. Пожалуйста, выберите сегодняшнюю или будущую дату.',
    languageButtonLabel: 'Язык',
    languageButtonAria: 'Переключить язык',
    nextReminderTitle: 'Следующее напоминание',
    allRemindersTitle: 'Все напоминания',
    emptyTitle: 'Нет напоминаний',
    emptyHint: 'Создайте первое напоминание выше',
    deleteAria: 'Удалить',
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
