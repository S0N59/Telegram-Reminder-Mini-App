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
  notionToken?: string;
  notionDatabaseId?: string;
  onSaveNotion: (token: string, dbId: string) => Promise<boolean>;
}

const accentColors: { value: AccentColor; label: string; color: string }[] = [
  { value: 'red', label: '❤️', color: '#ff3b30' },
  { value: 'orange', label: '🧡', color: '#ff9500' },
  { value: 'yellow', label: '💛', color: '#ffcc00' },
  { value: 'toxic-yellow', label: '☣️', color: '#ccff00' },
  { value: 'green', label: '💚', color: '#34c759' },
  { value: 'cyan', label: '💎', color: '#5ac8fa' },
  { value: 'blue', label: '💙', color: '#3390ec' },
  { value: 'indigo', label: '🔮', color: '#5856d6' },
  { value: 'purple', label: '💜', color: '#af52de' },
  { value: 'pink', label: '🌸', color: '#ff2d55' },
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
  notionToken,
  notionDatabaseId,
  onSaveNotion
}: SettingsProps) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  const toggleDropdown = (id: string) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  const closeDropdowns = () => setOpenDropdown(null);

  useEffect(() => {
    const handleGlobalClick = () => closeDropdowns();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

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

  const handleInviteFriend = () => {
    if (!userId) return;
    const inviteLink = `https://t.me/${config.botUsername}?start=add_${userId}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Add me to your Reminder contacts so we can send each other reminders!')}`;
    
    const webApp = (window as any).Telegram?.WebApp;
    if (webApp) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-content">
        {/* Friends & Connections */}
        {userId && (
          <div className="settings-group friends-invite-group">
            <label className="settings-label">
              <span className="label-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </span>
              FRIENDS & INVITES
            </label>
            <p className="settings-hint" style={{ marginBottom: '14px' }}>
              Connect with friends to send and receive reminders. Share your unique invite link below:
            </p>
            <button 
              type="button" 
              className="settings-invite-btn"
              onClick={handleInviteFriend}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Share Invite Link</span>
            </button>
          </div>
        )}
        <div className="settings-group">
          <label className="settings-label">
            <span className="label-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 18V12"></path><path d="M12 8H12.01"></path></svg>
            </span>
            THEME COLOR
          </label>
          <div className="settings-colors">
            {accentColors.map(c => (
              <button 
                key={c.value}
                className={`color-option ${accentColor === c.value ? 'active' : ''}`}
                style={{ backgroundColor: c.color }}
                onClick={() => onAccentColorChange(c.value as any)}
              >
                {accentColor === c.value && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <label className="settings-label">
              <span className="label-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </span>
              UNIFORM PRIORITY
            </label>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={monochromePriority} 
                onChange={(e) => onMonochromePriorityChange(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          <p className="settings-hint">Use theme color for all priority levels</p>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <label className="settings-label" style={{ marginBottom: 0 }}>
              <span className="label-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </span>
              RE-REMIND
            </label>
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
            <div className="custom-select-container" style={{ marginTop: '14px' }}>
              <button 
                type="button"
                className={`custom-select-trigger ${openDropdown === 'settings-reremind' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleDropdown('settings-reremind'); }}
              >
                <span>Every {reRemindInterval} min</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              {openDropdown === 'settings-reremind' && (
                <div className="custom-select-options">
                  {intervalOptions.map(min => (
                    <div key={min} className="option" onClick={() => { onReRemindIntervalChange(min); closeDropdowns(); }}>{min} min</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notion Integration */}
        <div className="settings-group notion-integration-group">
          <label className="settings-label">
            <span className="label-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" ry="4"></rect>
                <polyline points="8 16 8 8 16 16 16 8"></polyline>
              </svg>
            </span>
            NOTION INTEGRATION
            {isConnected && <span className="notion-badge connected">● Connected</span>}
            {!isConnected && <span className="notion-badge disconnected">○ Not connected</span>}
          </label>
          <div className="settings-row" style={{ marginTop: '12px', marginBottom: '12px' }}>
            <label className="settings-label" style={{ marginBottom: 0, paddingLeft: 0 }}>
              Enable Notion Sync
            </label>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={enableNotion} 
                onChange={(e) => {
                  setEnableNotion(e.target.checked);
                  if (!e.target.checked && isConnected) {
                    handleDisconnectNotion();
                  }
                }}
              />
              <span className="slider"></span>
            </label>
          </div>

          {enableNotion && (
            <>
              <p className="settings-hint" style={{ marginBottom: '12px' }}>
            Sync your reminders to your personal Notion database. Optional.
          </p>

          <div className="notion-fields">
            <div className="notion-field">
              <label className="notion-field-label">Integration Token</label>
              <input
                id="notion-token-input"
                className="notion-input"
                type="password"
                placeholder="secret_xxxxxxxxxxxx"
                value={notionTokenInput}
                onChange={e => setNotionTokenInput(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="notion-field">
              <label className="notion-field-label">Database ID</label>
              <input
                id="notion-database-input"
                className="notion-input"
                type="text"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={notionDbInput}
                onChange={e => setNotionDbInput(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <button
            className={`notion-guide-toggle`}
            onClick={() => setShowGuide(!showGuide)}
            type="button"
          >
            {showGuide ? '▲' : '▼'} How to get your credentials?
          </button>

          {showGuide && (
            <div className="notion-guide">
              <p><b>1. Notion Token:</b> Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer">notion.so/my-integrations</a>, create a new integration, copy the <b>Internal Integration Token</b>.</p>
              <p><b>2. Database ID:</b> Open your Notion database in the browser. The ID is in the URL: <code>notion.so/YOUR_ID?v=...</code>. Copy the part before <code>?v=</code>.</p>
              <p><b>3. Share:</b> In your Notion database, click "..." → "Add connections" and select your integration.</p>
            </div>
          )}

          <div className="notion-actions">
            <button
              id="save-notion-btn"
              className={`notion-save-btn ${notionStatus}`}
              onClick={handleSaveNotion}
              disabled={notionStatus === 'saving'}
              type="button"
            >
              {notionStatus === 'saving' && '⏳ Saving...'}
              {notionStatus === 'saved' && '✅ Saved!'}
              {notionStatus === 'error' && '❌ Error'}
              {notionStatus === 'idle' && (isConnected ? '💾 Update Credentials' : '🔗 Connect Notion')}
            </button>
            {isConnected && (
              <button
                id="disconnect-notion-btn"
                className="notion-disconnect-btn"
                onClick={handleDisconnectNotion}
                disabled={notionStatus === 'saving'}
                type="button"
              >
                Disconnect
              </button>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

