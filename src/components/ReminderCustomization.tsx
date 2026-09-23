import { useState } from 'react';
import {
  NotificationConfig,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../utils/settingsAPI';
import './ReminderCustomization.css';

interface ReminderCustomizationProps {
  initialConfig?: NotificationConfig | null;
  onSave: (config: NotificationConfig) => Promise<boolean>;
  onReset: () => Promise<boolean>;
}

export const ReminderCustomization = ({
  initialConfig,
  onSave,
  onReset,
}: ReminderCustomizationProps) => {
  const [config, setConfig] = useState<NotificationConfig>(
    initialConfig || DEFAULT_NOTIFICATION_CONFIG
  );
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const updateTextStyle = (textStyle: NotificationConfig['textStyle']) => {
    setConfig(prev => ({ ...prev, textStyle }));
    setSpoilerRevealed(false);
  };

  const toggleDetail = (key: 'showTime' | 'showPriority' | 'showStatus' | 'showCreator') => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleButton = (key: keyof NotificationConfig['buttons']) => {
    setConfig(prev => ({
      ...prev,
      buttons: {
        ...prev.buttons,
        [key]: !prev.buttons[key],
      },
    }));
  };

  const handleSave = async () => {
    setSavingStatus('saving');
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}

    const ok = await onSave(config);
    setSavingStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSavingStatus('idle'), 2500);
  };

  const handleReset = async () => {
    setConfig(DEFAULT_NOTIFICATION_CONFIG);
    setSpoilerRevealed(false);
    setSavingStatus('saving');
    const ok = await onReset();
    setSavingStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSavingStatus('idle'), 2500);
  };

  const sampleTask = 'Water the office plants & check inbox';

  return (
    <div className="rem-cust-container animate-fade-in">
      {/* ── 1. Live Telegram Preview Header ── */}
      <div className="rem-cust-section">
        <div className="rem-cust-header-row">
          <div className="rem-cust-title-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3390ec' }}>
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="rem-cust-section-title">Live Telegram Preview</span>
          </div>
          <span className="rem-cust-live-badge">Live</span>
        </div>

        {/* Telegram Chat Bubble Mockup */}
        <div className="tg-chat-preview-box">
          <div className="tg-msg-bubble">
            {/* Bot Header */}
            <div className="tg-msg-header">
              <div className="tg-bot-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <div className="tg-bot-info">
                <span className="tg-bot-name">Remigram</span>
                <span className="tg-bot-tag">BOT</span>
              </div>
              <span className="tg-msg-time">18:00</span>
            </div>

            {/* Notification Title */}
            <div className="tg-msg-title">🔔 <b>REMINDER</b></div>

            {/* Formatted Task Text */}
            <div className="tg-msg-task-body">
              📝{' '}
              {config.textStyle === 'default' && (
                <b className="tg-text-bold">{sampleTask}</b>
              )}

              {config.textStyle === 'spoiler' && (
                <span
                  className={'tg-spoiler-bubble ' + (spoilerRevealed ? 'revealed' : '')}
                  onClick={() => setSpoilerRevealed(!spoilerRevealed)}
                  title="Tap to reveal spoiler"
                >
                  {spoilerRevealed ? (
                    <b>{sampleTask}</b>
                  ) : (
                    <span className="tg-spoiler-shimmer">|| Tap to reveal spoiler ||</span>
                  )}
                </span>
              )}

              {config.textStyle === 'quote' && (
                <div className="tg-quote-block">
                  <span className="tg-quote-bar" />
                  <span className="tg-quote-text">{sampleTask}</span>
                </div>
              )}

              {config.textStyle === 'monospace' && (
                <code className="tg-code-block">{sampleTask}</code>
              )}
            </div>

            {/* Metadata lines */}
            <div className="tg-msg-meta-lines">
              {config.showStatus && (
                <div className="tg-meta-line">
                  <span>📌 Status: ⚪ To Do</span>
                </div>
              )}
              {config.showTime && (
                <div className="tg-meta-line">
                  <span>⏰ In 15 minutes (18:00)</span>
                </div>
              )}
              {config.showPriority && (
                <div className="tg-meta-line">
                  <span>⚡ Priority: HIGH</span>
                </div>
              )}
              {config.showCreator && (
                <div className="tg-meta-line">
                  <span>📨 From: Alex Rivera</span>
                </div>
              )}
            </div>

            <div className="tg-msg-divider" />

            {/* Inline Keyboard Preview */}
            <div className="tg-msg-keyboard">
              {/* Row 1: Primary actions */}
              {(config.buttons.statusToggle || config.buttons.snooze15) && (
                <div className="tg-kbd-row">
                  {config.buttons.statusToggle && (
                    <button type="button" className="tg-kbd-btn primary">
                      🟡 In Progress
                    </button>
                  )}
                  {config.buttons.snooze15 && (
                    <button type="button" className="tg-kbd-btn">
                      ⏰ +15m
                    </button>
                  )}
                </div>
              )}

              {/* Row 2: Secondary actions */}
              {(config.buttons.edit || config.buttons.dismissMsg || config.buttons.deleteTask) && (
                <div className="tg-kbd-row">
                  {config.buttons.edit && (
                    <button type="button" className="tg-kbd-btn">
                      📝 Edit
                    </button>
                  )}
                  {config.buttons.dismissMsg && (
                    <button type="button" className="tg-kbd-btn">
                      🗑 Dismiss
                    </button>
                  )}
                  {config.buttons.deleteTask && (
                    <button type="button" className="tg-kbd-btn danger">
                      ❌ Delete
                    </button>
                  )}
                </div>
              )}

              {/* Row 3: Open in App */}
              {config.buttons.openApp && (
                <div className="tg-kbd-row">
                  <button type="button" className="tg-kbd-btn webapp">
                    🚀 Open Remigram
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Text Formatting Style ── */}
      <div className="rem-cust-section">
        <div className="rem-cust-section-title">Message Text Style</div>
        <div className="rem-cust-styles-grid">
          <button
            type="button"
            className={'rem-cust-style-card ' + (config.textStyle === 'default' ? 'active' : '')}
            onClick={() => updateTextStyle('default')}
          >
            <div className="style-card-icon-wrap default">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
            </div>
            <div className="style-card-title">Standard</div>
            <div className="style-card-desc">Bold crisp title</div>
          </button>

          <button
            type="button"
            className={'rem-cust-style-card ' + (config.textStyle === 'spoiler' ? 'active' : '')}
            onClick={() => updateTextStyle('spoiler')}
          >
            <div className="style-card-icon-wrap spoiler">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </div>
            <div className="style-card-title">Spoiler</div>
            <div className="style-card-desc">Tap to reveal privacy</div>
          </button>

          <button
            type="button"
            className={'rem-cust-style-card ' + (config.textStyle === 'quote' ? 'active' : '')}
            onClick={() => updateTextStyle('quote')}
          >
            <div className="style-card-icon-wrap quote">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="style-card-title">Quote</div>
            <div className="style-card-desc">Telegram blockquote</div>
          </button>

          <button
            type="button"
            className={'rem-cust-style-card ' + (config.textStyle === 'monospace' ? 'active' : '')}
            onClick={() => updateTextStyle('monospace')}
          >
            <div className="style-card-icon-wrap mono">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
            </div>
            <div className="style-card-title">Monospace</div>
            <div className="style-card-desc">Tech code style</div>
          </button>
        </div>
      </div>

      {/* ── 3. Information Details Toggles ── */}
      <div className="rem-cust-section">
        <div className="rem-cust-section-title">Message Details</div>
        <div className="rem-cust-options-list liquid-glass">
          <div className="rem-cust-option-item">
            <div className="option-icon-box blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Status Indicator</span>
              <span className="option-desc">Show status badge (⚪ To Do / 🟡 In Progress / 🟢 Done)</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.showStatus}
                onChange={() => toggleDetail('showStatus')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Trigger Time</span>
              <span className="option-desc">Show relative time (e.g. In 15 minutes / Today at 18:00)</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.showTime}
                onChange={() => toggleDetail('showTime')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box yellow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Priority Level</span>
              <span className="option-desc">Show task priority (LOW / MEDIUM / HIGH)</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.showPriority}
                onChange={() => toggleDetail('showPriority')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Sender Name</span>
              <span className="option-desc">Show creator name when received from a friend</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.showCreator}
                onChange={() => toggleDetail('showCreator')}
              />
              <span className="slider" />
            </label>
          </div>
        </div>
      </div>

      {/* ── 4. Action Buttons Customization ── */}
      <div className="rem-cust-section">
        <div className="rem-cust-section-title">Action Buttons Under Notification</div>
        <div className="rem-cust-options-list liquid-glass">
          <div className="rem-cust-option-item">
            <div className="option-icon-box green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Status Action Button</span>
              <span className="option-desc">Change status to 🟡 In Progress or 🟢 Done</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.statusToggle}
                onChange={() => toggleButton('statusToggle')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box yellow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Snooze Button (+15 min)</span>
              <span className="option-desc">Delay reminder by 15 minutes with a single tap</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.snooze15}
                onChange={() => toggleButton('snooze15')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Dismiss Button (Delete Message Only)</span>
              <span className="option-desc">Deletes message from Telegram chat without deleting task</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.dismissMsg}
                onChange={() => toggleButton('dismissMsg')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box red">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Delete Task Button</span>
              <span className="option-desc">Permanently deletes task and removes notification</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.deleteTask}
                onChange={() => toggleButton('deleteTask')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Edit Reminder Button</span>
              <span className="option-desc">Shows prompt to edit task in Remigram</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.edit}
                onChange={() => toggleButton('edit')}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="rem-cust-option-item">
            <div className="option-icon-box purple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div className="option-text-wrap">
              <span className="option-title">Open in Remigram Button</span>
              <span className="option-desc">Direct WebApp link to open the Mini App</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={config.buttons.openApp}
                onChange={() => toggleButton('openApp')}
              />
              <span className="slider" />
            </label>
          </div>
        </div>
      </div>

      {/* ── 5. Action Buttons (Save / Reset) ── */}
      <div className="rem-cust-actions-bar">
        <button
          type="button"
          className="rem-cust-btn-reset"
          onClick={handleReset}
          disabled={savingStatus === 'saving'}
        >
          Reset to Default
        </button>

        <button
          type="button"
          className="rem-cust-btn-save"
          onClick={handleSave}
          disabled={savingStatus === 'saving'}
        >
          {savingStatus === 'saving' ? (
            <span className="rem-cust-spinner" />
          ) : savingStatus === 'saved' ? (
            '✓ Saved!'
          ) : (
            'Save Customization'
          )}
        </button>
      </div>
    </div>
  );
};
