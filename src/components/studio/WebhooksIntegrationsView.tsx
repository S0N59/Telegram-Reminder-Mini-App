import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { YouTubeConfigView } from '../settings/YouTubeIntegrationSection';
import { fetchUserSettings, saveUserSettings } from '../../utils/settingsAPI';
import { fetchYouTubeConfig } from '../../utils/youtubeAPI';
import './WebhooksIntegrationsView.css';

/* ── Branded SVG Icons ── */

export const YouTubeIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const NotionIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
);

export const TwitchIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

type IntegrationSubView = 'catalog' | 'youtube' | 'notion';

interface WebhooksIntegrationsViewProps {
  onBack: () => void;
  userId?: number;
}

export const WebhooksIntegrationsView: React.FC<WebhooksIntegrationsViewProps> = ({
  onBack,
  userId,
}) => {
  const [subView, setSubView] = useState<IntegrationSubView>('catalog');

  // Connection statuses
  const [ytConnected, setYtConnected] = useState<boolean>(false);
  const [notionConnected, setNotionConnected] = useState<boolean>(false);

  // Always scroll to top when mounting or changing sub-views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
    const appContent = document.querySelector('.app-content');
    if (appContent) {
      appContent.scrollTop = 0;
    }
  }, [subView]);

  // Load connection statuses on mount
  useEffect(() => {
    (async () => {
      try {
        const ytConfig = await fetchYouTubeConfig();
        if (ytConfig) setYtConnected(true);
      } catch {}
      try {
        const settings = await fetchUserSettings();
        if (settings.notionToken) setNotionConnected(true);
      } catch {}
    })();
  }, []);

  const handleBackFromConfig = () => {
    setSubView('catalog');
  };

  // ── Sub-view: YouTube Config ──
  if (subView === 'youtube') {
    return (
      <YouTubeConfigView
        userId={userId}
        onBack={handleBackFromConfig}
        onConnectionChange={(connected) => setYtConnected(connected)}
      />
    );
  }

  // ── Sub-view: Notion Config ──
  if (subView === 'notion') {
    return (
      <NotionConfigView
        onBack={handleBackFromConfig}
        onConnectionChange={(connected) => setNotionConnected(connected)}
      />
    );
  }

  // ── Main view: Platform Catalog ──
  return (
    <div className="intg-catalog-container animate-fade-in">
      {/* Header */}
      <div className="intg-catalog-header">
        <button type="button" className="intg-back-btn" onClick={onBack} aria-label="Back to Studio">
          <ArrowLeft size={18} />
        </button>
        <div className="intg-header-text">
          <div className="intg-badge">
            <span className="intg-badge-dot" />
            <span>AUTOMATIONS</span>
          </div>
          <h1 className="intg-title">Integrations</h1>
          <p className="intg-desc">
            Connect platforms to auto-publish content to your Telegram channels.
          </p>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="intg-platforms-grid">
        {/* YouTube */}
        <button
          type="button"
          className="intg-platform-card"
          onClick={() => setSubView('youtube')}
        >
          <div className="platform-card-icon yt-brand">
            <YouTubeIcon size={28} />
          </div>
          <div className="platform-card-body">
            <div className="platform-card-name-row">
              <span className="platform-card-name">YouTube</span>
              <span className={`platform-card-status ${ytConnected ? 'active' : 'inactive'}`}>
                {ytConnected ? (
                  <><span className="status-dot" />Connected</>
                ) : (
                  'Not Connected'
                )}
              </span>
            </div>
            <span className="platform-card-desc">
              Auto-detect new video uploads and generate Telegram posts with thumbnails and watch buttons.
            </span>
          </div>
          <ChevronRight size={18} className="platform-card-chevron" />
        </button>

        {/* Notion */}
        <button
          type="button"
          className="intg-platform-card"
          onClick={() => setSubView('notion')}
        >
          <div className="platform-card-icon notion-brand">
            <NotionIcon size={28} />
          </div>
          <div className="platform-card-body">
            <div className="platform-card-name-row">
              <span className="platform-card-name">Notion</span>
              <span className={`platform-card-status ${notionConnected ? 'active' : 'inactive'}`}>
                {notionConnected ? (
                  <><span className="status-dot" />Connected</>
                ) : (
                  'Not Connected'
                )}
              </span>
            </div>
            <span className="platform-card-desc">
              Sync your reminders and tasks with a Notion database for two-way collaboration.
            </span>
          </div>
          <ChevronRight size={18} className="platform-card-chevron" />
        </button>

        {/* Twitch (Coming Soon) */}
        <div className="intg-platform-card disabled">
          <div className="platform-card-icon twitch-brand">
            <TwitchIcon size={28} />
          </div>
          <div className="platform-card-body">
            <div className="platform-card-name-row">
              <span className="platform-card-name">Twitch</span>
              <span className="platform-card-status coming-soon">Coming Soon</span>
            </div>
            <span className="platform-card-desc">
              Get notified when you go live and auto-post stream announcements to your channel.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════════════════════════
   NOTION CONFIG VIEW (inline — simpler than YouTube)
   ════════════════════════════════════════════════════════════════════════════ */

interface NotionConfigViewProps {
  onBack: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

const NotionConfigView: React.FC<NotionConfigViewProps> = ({ onBack, onConnectionChange }) => {
  const [loading, setLoading] = useState(true);
  const [notionToken, setNotionToken] = useState('');
  const [notionDb, setNotionDb] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const isConnected = !!notionToken;

  useEffect(() => {
    (async () => {
      try {
        const settings = await fetchUserSettings();
        if (settings.notionToken) {
          setNotionToken(settings.notionToken);
          setEnabled(true);
        }
        if (settings.notionDatabaseId) {
          setNotionDb(settings.notionDatabaseId);
        }
      } catch (err) {
        console.error('Failed to load Notion settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    const ok = await saveUserSettings({
      notionToken: notionToken.trim(),
      notionDatabaseId: notionDb.trim(),
    });
    setStatus(ok ? 'saved' : 'error');
    if (ok) onConnectionChange?.(true);
    setTimeout(() => setStatus('idle'), 2500);
  };

  const handleDisconnect = async () => {
    setNotionToken('');
    setNotionDb('');
    setEnabled(false);
    setStatus('saving');
    const ok = await saveUserSettings({ notionToken: '', notionDatabaseId: '' });
    setStatus(ok ? 'saved' : 'error');
    if (ok) onConnectionChange?.(false);
    setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className="intg-config-page animate-fade-in">
      {/* Top Navigation & Brand Header */}
      <div className="config-page-top-nav">
        <button type="button" className="intg-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="config-header-brand notion-brand-header">
          <div className="config-brand-icon notion-icon-lg">
            <NotionIcon size={32} />
          </div>
          <div className="config-brand-text">
            <h2 className="config-brand-title">Notion</h2>
            <span className="config-brand-subtitle">Two-Way Database Sync</span>
          </div>
          <span className={`config-status-pill ${isConnected && enabled ? 'active' : 'inactive'}`}>
            {isConnected && enabled ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="config-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <div className="config-body">
          {/* Enable Toggle */}
          <div className="config-toggle-row">
            <div className="config-toggle-info">
              <span className="config-toggle-label">Enable Notion Sync</span>
              <span className="config-toggle-hint">Sync reminders and tasks with your Notion workspace</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  if (!e.target.checked && isConnected) handleDisconnect();
                }}
              />
              <span className="slider" />
            </label>
          </div>

          {enabled && (
            <div className="config-form-fields animate-fade-in">
              <div className="config-input-group">
                <label className="config-field-label">
                  Integration Token <span className="req">*</span>
                </label>
                <input
                  type="password"
                  className="config-field-input"
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                />
                <span className="config-field-hint">
                  Create at notion.so/my-integrations and share the database with your integration.
                </span>
              </div>

              <div className="config-input-group">
                <label className="config-field-label">
                  Database ID <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="config-field-input"
                  placeholder="e.g. 8a2b1c3d4e5f6789..."
                  value={notionDb}
                  onChange={(e) => setNotionDb(e.target.value)}
                />
                <span className="config-field-hint">
                  Found in the URL of your Notion database page after the workspace name.
                </span>
              </div>

              <div className="config-action-bar">
                <button
                  type="button"
                  className="config-save-btn"
                  onClick={handleSave}
                  disabled={status === 'saving'}
                >
                  {status === 'saving' ? (
                    <><Loader2 size={15} className="animate-spin" /><span>Saving...</span></>
                  ) : status === 'saved' ? (
                    <><Check size={15} /><span>Saved!</span></>
                  ) : (
                    <><Check size={15} /><span>Save Credentials</span></>
                  )}
                </button>

                {isConnected && (
                  <button
                    type="button"
                    className="config-disconnect-btn"
                    onClick={handleDisconnect}
                    disabled={status === 'saving'}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
