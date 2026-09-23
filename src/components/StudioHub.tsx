import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelegramPostEditor } from './studio/editor/TelegramPostEditor';
import { WebhooksIntegrationsView, YouTubeIcon, NotionIcon, TwitchIcon } from './studio/WebhooksIntegrationsView';
import './StudioHub.css';

interface StudioHubProps {
  accentColor?: string;
  onEditorActiveChange?: (inEditor: boolean) => void;
  userId?: number;
}

type StudioView = 'launcher' | 'rich-editor' | 'integrations';

export const StudioHub: React.FC<StudioHubProps> = ({ accentColor = 'lime', onEditorActiveChange, userId }) => {
  const [activeView, setActiveView] = useState<StudioView>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const webApp = (window as any)?.Telegram?.WebApp;
      const startParam = webApp?.initDataUnsafe?.start_param || p.get('start') || p.get('mode');
      if (startParam === 'editor' || p.get('mode') === 'editor') {
        return 'rich-editor';
      }
      if (startParam === 'integrations' || p.get('mode') === 'integrations') {
        return 'integrations';
      }
    }
    return 'launcher';
  });

  useEffect(() => {
    onEditorActiveChange?.(activeView === 'rich-editor');
  }, [activeView, onEditorActiveChange]);

  const handleOpenModule = (moduleId: string) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}

    if (moduleId === 'rich-editor') {
      setActiveView('rich-editor');
    } else if (moduleId === 'integrations') {
      setActiveView('integrations');
    }
  };

  const handleBackToLauncher = () => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    setActiveView('launcher');
  };

  return (
    <div className={`studio-container animate-fade-in ${activeView === 'rich-editor' ? 'in-editor' : ''}`}>
      <AnimatePresence mode="wait">
        {activeView === 'launcher' ? (
          <motion.div
            key="launcher"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="studio-launcher-view"
          >
            {/* Header */}
            <div className="studio-header">
              <div className="studio-title-row">
                <div className="studio-badge-pill">
                  <span className="studio-badge-dot" />
                  <span>CREATOR & BUSINESS SUITE</span>
                </div>
              </div>
              <h1 className="studio-heading">Studio</h1>
              <p className="studio-subheading">
                Next-level ecosystem for creators, businesses & integrations.
              </p>
            </div>

            {/* Hero Hub Banner */}
            <div className="studio-hero-card">
              <div className="studio-hero-bg-glow" />
              <div className="studio-hero-content">
                <div className="studio-hero-icon-bubble">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div className="studio-hero-text">
                  <span className="studio-hero-title">Multi-App Workspace</span>
                  <span className="studio-hero-desc">
                    Connected tools built directly on top of Telegram's native platform.
                  </span>
                </div>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="studio-section">
              <div className="studio-section-label">Content & Notification Tools</div>
              <div className="studio-grid">
                {/* Module 1: Telegram Rich Text Editor (Active!) */}
                <div
                  className="studio-module-card active-card"
                  onClick={() => handleOpenModule('rich-editor')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="module-card-top">
                    <div className="module-icon-wrap editor">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </div>
                    <span className="module-status-badge ready">Ready</span>
                  </div>
                  <div className="module-info">
                    <span className="module-name">Telegram Post Composer</span>
                    <span className="module-desc">
                      Professional post workspace with rich text, photo albums, files, captions, and live preview.
                    </span>
                  </div>
                  <div className="module-footer">
                    <span className="module-action-link">
                      Open Composer
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Module 2: Webhooks & API (Active!) */}
                <div
                  className="studio-module-card active-card"
                  onClick={() => handleOpenModule('integrations')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="module-card-top">
                    <div className="module-icon-wrap webhook">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </div>
                    <div className="module-integrations-icons">
                      <span className="mini-icon-pill yt" title="YouTube"><YouTubeIcon size={14} /></span>
                      <span className="mini-icon-pill notion" title="Notion"><NotionIcon size={14} /></span>
                      <span className="mini-icon-pill twitch" title="Twitch"><TwitchIcon size={14} /></span>
                    </div>
                    <span className="module-status-badge ready">Ready</span>
                  </div>
                  <div className="module-info">
                    <span className="module-name">Webhook & API Integrations</span>
                    <span className="module-desc">
                      Connect YouTube video auto-posting, Notion task sync & custom API automations.
                    </span>
                  </div>
                  <div className="module-footer">
                    <span className="module-action-link">
                      Configure Integrations
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business & Integrations Section */}
            <div className="studio-section">
              <div className="studio-section-label">Team & Automation Workspaces</div>
              <div className="studio-grid">
                {/* Module 3: Channel & Broadcast (Teaser) */}
                <div className="studio-module-card disabled-card">
                  <div className="module-card-top">
                    <div className="module-icon-wrap channel">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>
                    <span className="module-status-badge soon">Coming Soon</span>
                  </div>
                  <div className="module-info">
                    <span className="module-name">Channel Broadcasts</span>
                    <span className="module-desc">
                      Schedule automated alerts, rich posts & scheduled reminders across Telegram channels.
                    </span>
                  </div>
                </div>

                {/* Module 4: Team Workspaces */}
                <div className="studio-module-card disabled-card">
                  <div className="module-card-top">
                    <div className="module-icon-wrap team">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <span className="module-status-badge soon">Coming Soon</span>
                  </div>
                  <div className="module-info">
                    <span className="module-name">Team Matrix</span>
                    <span className="module-desc">
                      Multi-seat delegations, client appointments & collaborative task flows.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeView === 'integrations' ? (
          /* ── Webhook & API Integrations Window ── */
          <motion.div
            key="integrations"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%' }}
          >
            <WebhooksIntegrationsView
              onBack={handleBackToLauncher}
              userId={userId}
            />
          </motion.div>
        ) : (
          /* ── Telegram Post Editor Window ── */
          <motion.div
            key="rich-editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%' }}
          >
            <TelegramPostEditor
              onBack={handleBackToLauncher}
              accentColor={accentColor}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
