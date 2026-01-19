import { useState } from 'react';
import './Calendar.css';

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

export const Calendar = ({ selectedDate, onSelectDate, onClose }: CalendarProps) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isPast = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (year: number, month: number, day: number): boolean => {
    if (!selectedDate) return false;
    return formatDate(year, month, day) === selectedDate;
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(currentYear, currentMonth, day);
    onSelectDate(dateStr);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days = [];

  // Пустые ячейки для дней предыдущего месяца
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  // Дни текущего месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const isPastDay = isPast(currentYear, currentMonth, day);
    const isTodayDay = isToday(currentYear, currentMonth, day);
    const isSelectedDay = isSelected(currentYear, currentMonth, day);

    days.push(
      <div
        key={day}
        className={`calendar-day ${isPastDay ? 'past' : ''} ${isTodayDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''}`}
        onClick={() => !isPastDay && handleDateClick(day)}
      >
        {day}
      </div>
    );
  }

  return (
    <div className="calendar-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-header">
          <button className="calendar-nav-button" onClick={goToPreviousMonth}>
            ‹
          </button>
          <h3 className="calendar-title">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button className="calendar-nav-button" onClick={goToNextMonth}>
            ›
          </button>
        </div>

        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-days">
          {days}
        </div>

        <div className="calendar-footer">
          <button className="calendar-close-button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
