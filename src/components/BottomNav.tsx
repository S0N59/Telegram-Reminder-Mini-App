import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { getTelegramWebApp } from '../utils/telegram';
import './BottomNav.css';

export type TabType = 'inbox' | 'activity' | 'create' | 'friends' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isKeyboardVisible?: boolean;
}

interface TabItemConfig {
  id: TabType;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: TabItemConfig[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
  },
  {
    id: 'create',
    label: 'Create',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    ),
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isKeyboardVisible = false,
}) => {
  const webApp = getTelegramWebApp();
  const navRef = useRef<HTMLElement>(null);

  if (isKeyboardVisible) return null;

  const handleTabClick = (tab: TabType) => {
    if (tab === activeTab) return;
    try {
      webApp?.HapticFeedback?.selectionChanged?.();
    } catch {
      // ignore
    }
    onTabChange(tab);
  };

  // Handle Drag/Touch gesture across navigation bar
  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!navRef.current) return;
    const touch = e.touches[0];
    const rect = navRef.current.getBoundingClientRect();
    const relativeX = touch.clientX - rect.left;
    const tabWidth = rect.width / TABS.length;
    const tabIndex = Math.max(0, Math.min(TABS.length - 1, Math.floor(relativeX / tabWidth)));
    const targetTab = TABS[tabIndex].id;
    if (targetTab !== activeTab) {
      handleTabClick(targetTab);
    }
  };

  return (
    <nav
      ref={navRef}
      className="liquid-glass-nav-island"
      role="navigation"
      aria-label="Main Navigation"
      onTouchMove={handleTouchMove}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`glass-nav-item ${isActive ? 'active' : ''} ${tab.id === 'create' ? 'is-create-tab' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            aria-label={tab.label}
          >
            {/* Sliding Liquid Glass Bubble Pill Animation */}
            {isActive && (
              <motion.div
                layoutId="liquidNavIndicator"
                className="glass-nav-active-pill"
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 28,
                  mass: 0.7,
                }}
              >
                <div className="glass-nav-pill-glow" />
              </motion.div>
            )}

            <motion.div
              className="glass-nav-icon-wrap"
              animate={isActive ? { scale: [1, 1.2, 0.96, 1.08], y: [0, -2.5, 0.5, 0] } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25, mass: 0.5 }}
            >
              {tab.icon(isActive)}
            </motion.div>
            <motion.span
              className="glass-nav-label"
              animate={isActive ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.55 }}
              transition={{ duration: 0.2 }}
            >
              {tab.label}
            </motion.span>
          </button>
        );
      })}
    </nav>
  );
};
