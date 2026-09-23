import { useState, useRef, useCallback } from 'react';
import type { AIReminderIntent } from '../utils/aiParser';
import { config } from '../config';
import { telegramApiHeaders } from '../utils/api';
import './AIReminderInput.css';

interface AIReminderInputProps {
  userId?: number;
  onResult: (intent: AIReminderIntent) => void;
  onError?: (msg: string) => void;
}

type InputState = 'idle' | 'loading' | 'error';

interface QuickAction {
  id: string;
  icon: JSX.Element;
  title: string;
  desc?: string;
  promptText: string;
}

interface PopularPrompt {
  id: string;
  text: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create_quick',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    title: 'Create Reminder',
    desc: 'Quick task setup',
    promptText: 'Remind me tonight ',
  },
  {
    id: 'friend_remind',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Remind Friend',
    desc: 'Shared reminder',
    promptText: 'Remind my friend tomorrow at 15:00 ',
  },
  {
    id: 'my_tasks',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: 'My Schedule',
    desc: 'Weekly agenda',
    promptText: 'What do I have scheduled for this week?',
  },
  {
    id: 'formulate_help',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Smart Grouping',
    desc: 'Multi-task parsing',
    promptText: 'Remind me tomorrow at 10 to check email, at 14 meeting, and at 19 workout',
  },
];

const POPULAR_PROMPTS: PopularPrompt[] = [
  { id: 'p1', text: 'Remind me tomorrow to check the server' },
  { id: 'p2', text: 'What do I have planned for today?' },
  { id: 'p3', text: 'Create a recurring weekly reminder' },
  { id: 'p4', text: 'Remind Artem on Friday at 18:00' },
  { id: 'p5', text: 'Every Monday at 09:00 team sync' },
];

export const AIReminderInput = ({ userId, onResult, onError }: AIReminderInputProps) => {
  const [text, setText] = useState('');
  const [state, setState] = useState<InputState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [starsRemaining, setStarsRemaining] = useState(3);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 130) + 'px';
  };


  const sendToAI = useCallback(async (inputText: string) => {
    if (!inputText.trim()) return;
    setState('loading');
    setErrorMsg('');

    try {
      const now = new Date();
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const response = await fetch(`${config.backendUrl}/api/ai`, {
        method: 'POST',
        headers: telegramApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          text: inputText.trim(),
          userId: userId || 0,
          currentDate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        if (data.code === 'daily_limit_reached') {
          setDailyLimitReached(true);
          setState('error');
          setErrorMsg(data.error);
          return;
        }
        throw new Error(data.error || 'AI is currently unavailable');
      }

      if (data.data.intent === 'unknown' || data.data.tasks.length === 0) {
        throw new Error("Could not understand that request. Try rephrasing.");
      }

      setStarsRemaining(prev => Math.max(0, prev - 1));
      setState('idle');
      onResult(data.data);
    } catch (err: any) {
      setState('error');
      const msg = err.message || 'AI is temporarily unavailable. Create reminder manually.';
      setErrorMsg(msg);
      onError?.(msg);
    }
  }, [userId, onResult, onError]);

  const handleSubmit = () => {
    if (text.trim()) {
      sendToAI(text);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPrompt = (promptText: string) => {
    setText(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = promptText.length;
          autoResize(textareaRef.current);
        }
      }, 50);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    autoResize(e.target);
  };

  return (
    <div className="ai-workspace-container animate-fade-in">
      {/* 1. Main AI Welcome State Card with Star Credits Badge */}
      <div className="ai-welcome-card liquid-glass">
        <div className="ai-sparkle-icon-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
          </svg>
        </div>
        <div className="ai-welcome-content">
          <div className="ai-welcome-top-row">
            <div className="ai-welcome-greeting">Hello. How can I help?</div>
            <div className="ai-credits-badge" title="Remaining daily AI requests">
              <span className="ai-credits-star">✦</span>
              <span className="ai-credits-count">{starsRemaining} / 3</span>
              <span className="ai-credits-label">Daily AI</span>
            </div>
          </div>
          <div className="ai-welcome-desc">
            Set reminders, schedule tasks for friends, or describe your plan naturally.
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="ai-section">
        <div className="ai-section-title">
          <span>Quick Actions</span>
        </div>
        <div className="ai-quick-actions-grid">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              type="button"
              className="ai-quick-action-card liquid-glass"
              onClick={() => handleSelectPrompt(action.promptText)}
            >
              <div className="ai-action-icon-box">{action.icon}</div>
              <div className="ai-action-text-box">
                <div className="ai-action-title">{action.title}</div>
                {action.desc && <div className="ai-action-desc">{action.desc}</div>}
              </div>
              <div className="ai-action-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Popular Prompts (Protected against parent swipe gestures) */}
      <div className="ai-section">
        <div className="ai-section-title">
          <span>Popular Prompts</span>
        </div>
        <div
          className="ai-prompts-scroll-container"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {POPULAR_PROMPTS.map(prompt => (
            <button
              key={prompt.id}
              type="button"
              className="ai-prompt-chip liquid-glass"
              onClick={() => handleSelectPrompt(prompt.text)}
            >
              <span className="ai-chip-sparkle">✦</span>
              <span className="ai-chip-text">{prompt.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Floating Premium Liquid Glass Chat Input */}
      <div className="ai-input-wrapper">
        <div className={`ai-input-floating-bar liquid-glass ${state}`}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe your reminder..."
            className="ai-floating-textarea"
            rows={2}
            disabled={state === 'loading'}
          />

          <div className="ai-floating-actions">
            <button
              type="button"
              className={`ai-btn-icon ai-btn-send ${text.trim() ? 'has-content' : ''}`}
              onClick={handleSubmit}
              disabled={!text.trim() || state === 'loading'}
              aria-label="Send"
            >
              {state === 'loading' ? (
                <span className="ai-loading-spinner" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {dailyLimitReached ? (
          <div className="ai-daily-limit-banner animate-fade-in">
            <div className="ai-daily-limit-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div className="ai-daily-limit-text">
              <div className="ai-daily-limit-title">Daily limit reached</div>
              <div className="ai-daily-limit-desc">3 free AI requests used today. Resets at midnight.<br/>Create reminders manually below.</div>
            </div>
          </div>
        ) : (state === 'error' && errorMsg && (
          <div className="ai-error-banner animate-fade-in">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


