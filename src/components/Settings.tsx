import { useState, useEffect } from 'react';
import { config } from '../config';
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
  onSaveNotion: (token: string, dbId: string) => Promise<boolean>;
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
  onSaveNotion
}: SettingsProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [notionTokenInput, setNotionTokenInput] = useState(notionToken || '');
  const [notionDbInput, setNotionDbInput] = useState(notionDatabaseId || '');
  const [notionStatus, setNotionStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showGuide, setShowGuide] = useState(false);
  const [enableNotion, setEnableNotion] = useState(!!notionToken);

  const isConnected = !!notionToken;

  useEffect(() => {
    setNotionTokenInput(notionToken || '');
    setNotionDbInput(notionDatabaseId || '');
    if (notionToken) setEnableNotion(true);
  }, [notionToken, notionDatabaseId]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSaveNotion = async () => {
    setNotionStatus('saving');
    const ok = await onSaveNotion(notionTokenInput.trim(), notionDbInput.trim());
    setNotionStatus(ok ? 'saved' : 'error');
    setTimeout(() => setNotionStatus('idle'), 2500);
  };

  const handleDisconnectNotion = async () => {
    setNotionTokenInput('');
    setNotionDbInput('');
    setNotionStatus('saving');
    const ok = await onSaveNotion('', '');
    setNotionStatus(ok ? 'saved' : 'error');
    setTimeout(() => setNotionStatus('idle'), 2500);
  };

  return (
    <div className="settings-page">
      {/* 1. Profile Card */}
      <div className="settings-profile-card">
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
          {userUsername && <span className="profile-username">@{userUsername}</span>}
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

        {/* Connected Accounts (Notion) */}
        <div className="settings-menu-item" onClick={() => toggleSection('connected')}>
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
          <span className="menu-item-title">Connected Accounts</span>
          <span className="menu-item-value">{isConnected ? 'Notion' : 'None'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`menu-item-chevron ${expandedSection === 'connected' ? 'rotated' : ''}`}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>

        {expandedSection === 'connected' && (
          <div className="settings-expandable-content">
            <div className="expand-row">
              <span>Enable Notion Sync</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={enableNotion}
                  onChange={(e) => {
                    setEnableNotion(e.target.checked);
                    if (!e.target.checked && isConnected) handleDisconnectNotion();
                  }}
                />
                <span className="slider"></span>
              </label>
            </div>
            {enableNotion && (
              <div className="notion-config-fields">
                <input
                  className="notion-field-input"
                  type="password"
                  placeholder="Notion Integration Token"
                  value={notionTokenInput}
                  onChange={e => setNotionTokenInput(e.target.value)}
                />
                <input
                  className="notion-field-input"
                  type="text"
                  placeholder="Notion Database ID"
                  value={notionDbInput}
                  onChange={e => setNotionDbInput(e.target.value)}
                />
                <button
                  type="button"
                  className="notion-save-action-btn"
                  onClick={handleSaveNotion}
                  disabled={notionStatus === 'saving'}
                >
                  {notionStatus === 'saving' ? 'Saving...' : notionStatus === 'saved' ? 'Saved!' : 'Save Credentials'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
