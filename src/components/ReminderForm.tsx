import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { ReminderFormData } from '../types/reminder';
import { getTelegramWebApp } from '../utils/telegram';
import './ReminderForm.css';

interface ReminderFormProps {
  onSave: (reminder: ReminderFormData) => void;
  strings: {
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
    monthsShort: string[];
  };
}

export const ReminderForm = ({ onSave, strings }: ReminderFormProps) => {
  // Initialize with current date
  const getCurrentDate = () => {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0'),
      hours: String(now.getHours()).padStart(2, '0'),
      minutes: String(now.getMinutes()).padStart(2, '0'),
    };
  };

  const currentDate = getCurrentDate();
  
  // Initialize form with current date
  const getInitialFormData = (): ReminderFormData => {
    return {
      text: '',
      date: '',
      year: currentDate.year,
      month: currentDate.month,
      day: currentDate.day,
      hours: currentDate.hours,
      minutes: currentDate.minutes
    };
  };

  const [formData, setFormData] = useState<ReminderFormData>(getInitialFormData());

  const webApp = getTelegramWebApp();

  const handleSave = useCallback(() => {
    const dateStr = `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`;
    
    // Final validation: ensure date is not in the past
    if (!isDateValid(formData.year, formData.month, formData.day)) {
      alert(strings.invalidPastDate);
      const today = getCurrentDate();
      setFormData(prev => ({ ...prev, year: today.year, month: today.month, day: today.day }));
      return;
    }
    
    if (formData.text.trim() && formData.year && formData.month && formData.day && formData.hours && formData.minutes) {
      onSave({
        ...formData,
        date: dateStr
      });
      // Reset form but keep current date
      const today = getCurrentDate();
      setFormData({
        text: '',
        date: '',
        year: today.year,
        month: today.month,
        day: today.day,
        hours: today.hours,
        minutes: today.minutes
      });
    }
  }, [formData, onSave]);

  const isDateValid = (year: string, month: string, day: string): boolean => {
    if (!year || !month || !day) return true; // Allow empty during typing
    
    const selectedDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= today;
  };

  const handleYearChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, year: value };
      if (value && prev.month && prev.day && !isDateValid(value, prev.month, prev.day)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  const handleMonthChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, month: value.padStart(2, '0') };
      if (prev.year && value && prev.day && !isDateValid(prev.year, value, prev.day)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  const handleDayChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, day: value.padStart(2, '0') };
      if (prev.year && prev.month && value && !isDateValid(prev.year, prev.month, value)) {
        const today = getCurrentDate();
        return { ...newData, year: today.year, month: today.month, day: today.day };
      }
      return newData;
    });
  };

  // Скрываем MainButton, так как используем свою кнопку
  useEffect(() => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, text: e.target.value }));
  };

  const handleHoursChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // Keep the value as-is from the select (already padded with leading zero)
    setFormData(prev => ({ ...prev, hours: e.target.value }));
  };

  const handleMinutesChange = (e: ChangeEvent<HTMLSelectElement>) => {
    // Keep the value as-is from the select (already padded with leading zero)
    setFormData(prev => ({ ...prev, minutes: e.target.value }));
  };


  const years = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => (start + idx).toString());
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const value = String(idx + 1).padStart(2, '0');
      return {
        value,
        label: value
      };
    });
  }, [strings.monthsShort]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, idx) => String(idx + 1).padStart(2, '0')), []);

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isDayDisabled = (day: string) => {
    const yearNum = parseInt(formData.year, 10);
    const monthNum = parseInt(formData.month, 10);
    const dayNum = parseInt(day, 10);
    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum)) {
      return false;
    }
    const d = new Date(yearNum, monthNum - 1, dayNum);
    d.setHours(0, 0, 0, 0);
    return d < todayMidnight;
  };

  return (
    <div className="reminder-form">
      <div className="form-card">
        <div className="form-header">
          <span className="form-icon">➕</span>
          <h2>{strings.newReminderTitle}</h2>
        </div>

        <div className="form-group">
          <label htmlFor="reminder-text" className="form-label">
            <span className="label-icon">📝</span>
            {strings.reminderTextLabel}
          </label>
          <input
            id="reminder-text"
            type="text"
            value={formData.text}
            onChange={handleTextChange}
            placeholder={strings.reminderTextPlaceholder}
            className="form-input"
            maxLength={200}
          />
          <div className="char-counter">
            {formData.text.length}/200
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">📅</span>
            {strings.dateLabel}
          </label>
          <div className="date-inputs">
            <div className="date-input-group">
              <select
                id="year"
                value={formData.year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="form-input date-input date-select"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <label htmlFor="year" className="date-label">{strings.yearLabel}</label>
            </div>
            <div className="date-input-group">
              <select
                id="month"
                value={formData.month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="form-input date-input date-select"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <label htmlFor="month" className="date-label">{strings.monthLabel}</label>
            </div>
            <div className="date-input-group">
              <select
                id="day"
                value={formData.day}
                onChange={(e) => handleDayChange(e.target.value)}
                className="form-input date-input date-select"
              >
                {days.map(day => (
                  <option key={day} value={day} disabled={isDayDisabled(day)}>{day}</option>
                ))}
              </select>
              <label htmlFor="day" className="date-label">{strings.dayLabel}</label>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span className="label-icon">⏰</span>
            {strings.timeLabel}
          </label>
          <div className="time-inputs">
            <div className="time-input-group">
              <select
                id="hours"
                value={formData.hours}
                onChange={handleHoursChange}
                className="form-input time-input time-select"
              >
                {Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <label htmlFor="hours" className="time-label">{strings.hoursLabel}</label>
            </div>
            <div className="time-input-group">
              <select
                id="minutes"
                value={formData.minutes}
                onChange={handleMinutesChange}
                className="form-input time-input time-select"
              >
                {Array.from({ length: 60 }, (_, idx) => String(idx).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <label htmlFor="minutes" className="time-label">{strings.minutesLabel}</label>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="save-button"
          onClick={handleSave}
          disabled={!formData.text.trim() || !formData.year || !formData.month || !formData.day || !formData.hours || !formData.minutes}
        >
          <span className="save-button-icon">💾</span>
          <span>{strings.createReminderButton}</span>
        </button>

      </div>
    </div>
  );
};
