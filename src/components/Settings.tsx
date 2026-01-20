import { useState } from 'react';
import type { Language } from '../i18n';
import './Settings.css';

export type AccentColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple';

interface SettingsProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  strings: {
    settingsTitle: string;
    languageLabel: string;
    accentColorLabel: string;
    closeButton: string;
  };
}

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: 'blue', label: '💙', color: '#3390ec' },
  { value: 'red', label: '❤️', color: '#ff3b30' },
  { value: 'yellow', label: '💛', color: '#ffcc00' },
  { value: 'green', label: '💚', color: '#34c759' },
  { value: 'purple', label: '💜', color: '#af52de' },
];

export const Settings = ({ 
  language, 
  onLanguageChange,
  accentColor, 
  onAccentColorChange,
  strings 
}: SettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="settings-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-handle" />
            <div className="settings-header">
              <h2>⚙️ {strings.settingsTitle}</h2>
              <button 
                className="settings-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="settings-content">
              {/* Language */}
              <div className="settings-group">
                <label className="settings-label">🌐 {strings.languageLabel}</label>
                <div className="settings-options">
                  <button
                    className={`settings-option ${language === 'en' ? 'active' : ''}`}
                    onClick={() => onLanguageChange('en')}
                  >
                    EN
                  </button>
                  <button
                    className={`settings-option ${language === 'ru' ? 'active' : ''}`}
                    onClick={() => onLanguageChange('ru')}
                  >
                    RU
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="settings-group">
                <label className="settings-label">🎯 {strings.accentColorLabel}</label>
                <div className="settings-colors">
                  {accentColors.map((c) => (
                    <button
                      key={c.value}
                      className={`color-option ${accentColor === c.value ? 'active' : ''}`}
                      style={{ backgroundColor: c.color }}
                      onClick={() => onAccentColorChange(c.value)}
                      aria-label={c.value}
                    >
                      {accentColor === c.value && '✓'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
