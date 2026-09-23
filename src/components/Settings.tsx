import { useState, useEffect } from 'react';
import { config } from '../config';
import { ReminderCustomization } from './ReminderCustomization';
import { NotificationConfig } from '../utils/settingsAPI';
import './Settings.css';

export type AccentColor = 'blue' | 'red' | 'yellow' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'indigo' | 'toxic-yellow';

interface SettingsProps {
  accentColor: AccentColor;
  onAccentColorChange: (color: AccentColor) => void;
  reRemindInterval: number;
  onReRemindIntervalChange: (interval: number) => void;
  reRemindEnabled: boolean;
  onReRemindEnabledChange: (value: boolean) => void;
  monochromePriority: boolean;
  onMonochromePriorityChange: (value: boolean) => void;
  userId?: number;
  userName?: string;
  userUsername?: string;
  notionToken?: string;
  notionDatabaseId?: string;
  onSaveNotion?: (token: string, dbId: string) => Promise<boolean>;
  notificationConfig?: NotificationConfig | null;
  onSaveNotificationConfig?: (config: NotificationConfig) => Promise<boolean>;
  onResetNotificationConfig?: () => Promise<boolean>;
  onOpenActivity?: () => void;
}

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: 'toxic-yellow', label: 'Neon', color: '#ccff00' },
  { value: 'green', label: 'Green', color: '#34c759' },
  { value: 'blue', label: 'Blue', color: '#3390ec' },
  { value: 'purple', label: 'Purple', color: '#af52de' },
  { value: 'red', label: 'Red', color: '#ff3b30' },
  { value: 'orange', label: 'Orange', color: '#ff9500' },
  { value: 'yellow', label: 'Yellow', color: '#ffcc00' },
  { value: 'cyan', label: 'Cyan', color: '#5ac8fa' },
  { value: 'indigo', label: 'Indigo', color: '#5856d6' },
  { value: 'pink', label: 'Pink', color: '#ff2d55' },
];

const intervalOptions = [5, 10, 15, 30, 60];

export const Settings = ({
  accentColor,
  onAccentColorChange,
  reRemindInterval,
  onReRemindIntervalChange,
  reRemindEnabled,
  onReRemindEnabledChange,
  monochromePriority,
  onMonochromePriorityChange,
  userId,
  userName,
  userUsername,
  notionToken,
  notionDatabaseId,
  onSaveNotion,
  notificationConfig,
  onSaveNotificationConfig,
  onResetNotificationConfig,
  onOpenActivity,
}: SettingsProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="settings-page">
      {/* 1. Profile Card (Opens Activity) */}
      <div
        className="settings-profile-card"
        onClick={() => {
          try { (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.(); } catch {}
          onOpenActivity?.();
        }}
        role="button"
        tabIndex={0}
        aria-label="View Activity"
      >
         <div className="profile-avatar-circle">
           {userId ? (
             <img
               src={`${config.backendUrl}/api/avatar?userId=${userId}&name=${encodeURIComponent(userName || 'User')}`}
               alt={userName || 'User'}
               onError={(e) => {
                 (e.target as HTMLImageElement).style.display = 'none';
                 (e.target as HTMLImageElement).parentElement!.innerText = (userName || 'User').charAt(0).toUpperCase();
               }}
             />
           ) : (
             <span>{(userName || 'User').charAt(0).toUpperCase()}</span>
           )}
         </div>
        <div className="profile-info-text">
          <span className="profile-name">{userName || 'Remigram User'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {userUsername && <span className="profile-username">@{userUsername}</span>}
            <span style={{ fontSize: '11px', color: '#3390ec', fontWeight: 500 }}>· Activity</span>
          </div>
        </div>
        <div className="profile-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      {/* 2. Main Settings Rows Card */}
      <div className="settings-menu-card">
        {/* Notifications (Re-remind) */}
        <div className="settings-menu-item" onClick={() => toggleSection('notifications')}>
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <span className="menu-item-title">Notifications</span>
          <span className="menu-item-value">{reRemindEnabled ? `Every ${reRemindInterval}m` : 'Off'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`menu-item-chevron ${expandedSection === 'notifications' ? 'rotated' : ''}`}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        {expandedSection === 'notifications' && (
          <div className="settings-expandable-content">
            <div className="expand-row">
              <span>Enable Re-reminders</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reRemindEnabled}
                  onChange={(e) => onReRemindEnabledChange(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            {reRemindEnabled && (
              <div className="expand-row">
                <span>Interval</span>
                <div className="interval-chips">
                  {intervalOptions.map(min => (
                    <button
                      key={min}
                      type="button"
                      className={`interval-chip ${reRemindInterval === min ? 'active' : ''}`}
                      onClick={() => onReRemindIntervalChange(min)}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reminder Customization */}
        <div className="settings-menu-item" onClick={() => toggleSection('rem-customization')}>
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <span className="menu-item-title">Reminder Customization</span>
          <span className="menu-item-value" style={{ textTransform: 'capitalize' }}>
            {notificationConfig?.textStyle || 'Default'}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`menu-item-chevron ${expandedSection === 'rem-customization' ? 'rotated' : ''}`}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        {expandedSection === 'rem-customization' && (
          <div className="settings-expandable-content" style={{ padding: '8px 12px 16px' }}>
            <ReminderCustomization
              initialConfig={notificationConfig}
              onSave={onSaveNotificationConfig || (async () => true)}
              onReset={onResetNotificationConfig || (async () => true)}
            />
          </div>
        )}

        {/* Appearance */}
        <div className="settings-menu-item" onClick={() => toggleSection('appearance')}>
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
          <span className="menu-item-title">Appearance</span>
          <span className="menu-item-value">Dark</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`menu-item-chevron ${expandedSection === 'appearance' ? 'rotated' : ''}`}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        {expandedSection === 'appearance' && (
          <div className="settings-expandable-content">
            <div className="expand-label">Accent Theme Color</div>
            <div className="settings-colors-grid">
              {accentColors.map(c => (
                <button
                  key={c.value}
                  className={`color-choice-btn ${accentColor === c.value ? 'active' : ''}`}
                  style={{ backgroundColor: c.color }}
                  onClick={() => onAccentColorChange(c.value)}
                  aria-label={c.label}
                />
              ))}
            </div>
            <div className="expand-row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <span style={{ display: 'block', fontWeight: 600 }}>Monochrome Priority</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Use neutral gray dots instead of colors</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={monochromePriority}
                  onChange={(e) => onMonochromePriorityChange(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            {/* Priority Preview */}
            <div className="priority-preview-row">
              <span className="preview-label">Preview:</span>
              <div className="preview-dots-group">
                <span className={`priority-dot high ${monochromePriority ? 'mono-high' : ''}`} title="High"></span>
                <span className="dot-label">High</span>
                <span className={`priority-dot medium ${monochromePriority ? 'mono-medium' : ''}`} title="Medium"></span>
                <span className="dot-label">Med</span>
                <span className={`priority-dot low ${monochromePriority ? 'mono-low' : ''}`} title="Low"></span>
                <span className="dot-label">Low</span>
              </div>
            </div>
          </div>
        )}

        {/* Language */}
        <div className="settings-menu-item">
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <span className="menu-item-title">Language</span>
          <span className="menu-item-value">English</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="menu-item-chevron">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </div>
  );
};
