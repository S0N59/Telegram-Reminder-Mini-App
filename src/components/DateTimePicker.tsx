import { useState, useMemo } from 'react';
import './DateTimePicker.css';

interface DateTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialHours?: string; // HH
  initialMinutes?: string; // mm
  initialTab?: 'date' | 'time';
  onApply: (date: string, hours: string, minutes: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const QUICK_TIMES = [
  { label: 'Morning', time: '09:00', h: '09', m: '00' },
  { label: 'Noon', time: '12:00', h: '12', m: '00' },
  { label: 'Afternoon', time: '15:00', h: '15', m: '00' },
  { label: 'Evening', time: '18:00', h: '18', m: '00' },
  { label: 'Night', time: '21:00', h: '21', m: '00' },
];

export const DateTimePicker = ({
  isOpen,
  onClose,
  initialDate,
  initialHours = '12',
  initialMinutes = '00',
  initialTab = 'date',
  onApply
}: DateTimePickerProps) => {
  const [activeTab, setActiveTab] = useState<'date' | 'time'>(initialTab);

  // Parse initial date
  const now = new Date();
  const initDateObj = useMemo(() => {
    if (initialDate && initialDate.includes('-')) {
      const [y, m, d] = initialDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return now;
  }, [initialDate]);

  const [selectedYear, setSelectedYear] = useState<number>(initDateObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initDateObj.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number>(initDateObj.getDate());

  const [selectedHours, setSelectedHours] = useState<string>(initialHours.padStart(2, '0'));
  const [selectedMinutes, setSelectedMinutes] = useState<string>(initialMinutes.padStart(2, '0'));

  // Calendar navigation month/year
  const [viewYear, setViewYear] = useState<number>(initDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initDateObj.getMonth());

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate calendar days for viewYear & viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const handleSelectDay = (day: number) => {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
  };

  const isToday = (day: number) => {
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  const isSelectedDay = (day: number) => {
    return (
      selectedYear === viewYear &&
      selectedMonth === viewMonth &&
      selectedDay === day
    );
  };

  const isPastDay = (day: number) => {
    const check = new Date(viewYear, viewMonth, day, 23, 59, 59);
    return check.getTime() < now.getTime() && !isToday(day);
  };

  // Quick Date presets
  const handleQuickDate = (preset: 'today' | 'tomorrow' | 'in2days' | 'weekend') => {
    const target = new Date();
    if (preset === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    } else if (preset === 'in2days') {
      target.setDate(target.getDate() + 2);
    } else if (preset === 'weekend') {
      const day = target.getDay(); // 0 is Sunday, 6 is Saturday
      const diff = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + diff);
    }

    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  // Quick Time presets
  const handleQuickTime = (h: string, m: string) => {
    setSelectedHours(h.padStart(2, '0'));
    setSelectedMinutes(m.padStart(2, '0'));
  };

  const handleAddHours = (hrs: number) => {
    const currentH = parseInt(selectedHours, 10) || 0;
    const newH = (currentH + hrs) % 24;
    setSelectedHours(String(newH).padStart(2, '0'));
  };

  const handleApply = () => {
    const formattedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    onApply(formattedDate, selectedHours, selectedMinutes);
    onClose();
  };

  const formattedDisplayDate = () => {
    const d = new Date(selectedYear, selectedMonth, selectedDay);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="picker-modal-backdrop" onClick={onClose}>
      <div className="picker-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="picker-sheet-handle-bar">
          <div className="picker-sheet-handle"></div>
        </div>

        {/* Header Tabs */}
        <div className="picker-header">
          <div className="picker-tab-switch">
            <button
              type="button"
              className={`picker-tab-btn ${activeTab === 'date' ? 'active' : ''}`}
              onClick={() => setActiveTab('date')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{formattedDisplayDate()}</span>
            </button>
            <button
              type="button"
              className={`picker-tab-btn ${activeTab === 'time' ? 'active' : ''}`}
              onClick={() => setActiveTab('time')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{selectedHours}:{selectedMinutes}</span>
            </button>
          </div>

          <button type="button" className="picker-close-icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab 1: Date Picker */}
        {activeTab === 'date' && (
          <div className="picker-tab-content animate-fade-in">
            {/* Quick chips */}
            <div className="picker-quick-presets">
              <button type="button" className="quick-preset-chip" onClick={() => handleQuickDate('today')}>Today</button>
              <button type="button" className="quick-preset-chip" onClick={() => handleQuickDate('tomorrow')}>Tomorrow</button>
              <button type="button" className="quick-preset-chip" onClick={() => handleQuickDate('in2days')}>In 2 days</button>
              <button type="button" className="quick-preset-chip" onClick={() => handleQuickDate('weekend')}>Weekend</button>
            </div>

            {/* Month & Year Nav */}
            <div className="calendar-nav-bar">
              <span className="calendar-nav-title">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="calendar-nav-controls">
                <button type="button" className="cal-arrow-btn" onClick={handlePrevMonth} aria-label="Previous month">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button type="button" className="cal-arrow-btn" onClick={handleNextMonth} aria-label="Next month">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="calendar-grid-header">
              {WEEK_DAYS.map((wd, i) => (
                <div key={i} className={`cal-weekday ${i >= 5 ? 'weekend' : ''}`}>{wd}</div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="calendar-grid-days">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-day-cell empty"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSel = isSelectedDay(day);
                const isTod = isToday(day);
                const isPast = isPastDay(day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    className={`cal-day-cell ${isSel ? 'selected' : ''} ${isTod ? 'today' : ''} ${isPast ? 'past' : ''}`}
                    onClick={() => handleSelectDay(day)}
                  >
                    <span>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Time Picker */}
        {activeTab === 'time' && (
          <div className="picker-tab-content animate-fade-in">
            {/* Quick time chips */}
            <div className="picker-quick-presets">
              {QUICK_TIMES.map((qt) => (
                <button
                  key={qt.label}
                  type="button"
                  className="quick-preset-chip"
                  onClick={() => handleQuickTime(qt.h, qt.m)}
                >
                  {qt.label} ({qt.time})
                </button>
              ))}
              <button type="button" className="quick-preset-chip" onClick={() => handleAddHours(1)}>+1 Hour</button>
              <button type="button" className="quick-preset-chip" onClick={() => handleAddHours(3)}>+3 Hours</button>
            </div>

            {/* Time Grid: Hours & Minutes columns */}
            <div className="time-matrix-container">
              {/* Hours Column */}
              <div className="time-matrix-column">
                <div className="time-column-label">Hour</div>
                <div className="time-chips-scroll">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hStr = String(i).padStart(2, '0');
                    const isSel = selectedHours === hStr;
                    return (
                      <button
                        key={`h-${i}`}
                        type="button"
                        className={`time-matrix-chip ${isSel ? 'active' : ''}`}
                        onClick={() => setSelectedHours(hStr)}
                      >
                        {hStr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="time-matrix-divider">:</div>

              {/* Minutes Column */}
              <div className="time-matrix-column">
                <div className="time-column-label">Minute</div>
                <div className="time-chips-scroll">
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((mStr) => {
                    const isSel = selectedMinutes === mStr;
                    return (
                      <button
                        key={`m-${mStr}`}
                        type="button"
                        className={`time-matrix-chip ${isSel ? 'active' : ''}`}
                        onClick={() => setSelectedMinutes(mStr)}
                      >
                        {mStr}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Apply Button */}
        <div className="picker-sheet-footer">
          <button type="button" className="picker-apply-btn" onClick={handleApply}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
