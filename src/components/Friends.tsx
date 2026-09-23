import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchContactsAPI, addContactAPI, type BotContact } from '../utils/reminderStorage';
import { config } from '../config';
import { getTelegramWebApp } from '../utils/telegram';
import './Friends.css';

interface FriendsProps {
  userId?: number;
  onRemindFriend?: (contact: BotContact) => void;
}

export const Friends = ({ userId, onRemindFriend }: FriendsProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'connected' | 'invite'>('all');
  const [contacts, setContacts] = useState<BotContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const webApp = getTelegramWebApp();
  const effectiveUserId = userId || webApp?.initDataUnsafe?.user?.id;

  const loadContacts = useCallback(async () => {
    console.log('[Friends] loadContacts called, effectiveUserId:', effectiveUserId, typeof effectiveUserId);
    if (!effectiveUserId) {
      console.warn('[Friends] No userId provided, skipping contacts load');
      setLoading(false);
      return;
    }
    try {
      const data = await fetchContactsAPI(effectiveUserId);
      console.log('[Friends] Got contacts:', data?.length, 'for userId:', effectiveUserId);
      setContacts(data);
      setLoading(false);
    } catch (err) {
      console.error('[Friends] Error fetching contacts:', err, 'userId:', effectiveUserId);
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Open Telegram native contact share sheet
  const handleInviteFriend = useCallback(() => {
    const inviterId = effectiveUserId;
    if (!inviterId) {
      console.warn('[Friends] Cannot generate invite link: no user ID available');
      return;
    }
    const inviteLink = `https://t.me/${config.botUsername}?start=add_${inviterId}`;
    const text = '👋 Join me on Remigram to share reminders and stay organized together!';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    
    if (webApp && webApp.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }, [effectiveUserId, webApp]);

  // Direct add by username
  const handleAddDirectFriend = async () => {
    if (!directUsername.trim()) return;
    const cleanUsername = directUsername.trim().replace(/^@/, '');
    setAddingLoading(true);
    setStatusMessage(null);

    if (effectiveUserId) {
      try {
        const added = await addContactAPI(effectiveUserId, cleanUsername);
        if (added) {
          await loadContacts();
          setStatusMessage({
            text: `Added @${cleanUsername} to contacts!`,
            type: 'success'
          });
          if (onRemindFriend) {
            onRemindFriend(added);
          }
        } else {
          // If not in database yet, still offer to send them invite
          const dummyContact: BotContact = {
            userId: Date.now(),
            username: cleanUsername,
            firstName: cleanUsername,
            lastName: null
          };
          if (onRemindFriend) {
            onRemindFriend(dummyContact);
          }
        }
      } catch (err) {
        console.error('Error adding friend:', err);
      }
    }

    setDirectUsername('');
    setAddingLoading(false);
  };

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.firstName?.toLowerCase().includes(q)) ||
        (c.lastName?.toLowerCase().includes(q)) ||
        (c.username?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [contacts, searchQuery]);

  return (
    <div className="friends-page animate-fade-in">
      <div className="friends-top-actions-grid">
        {/* Primary Telegram Share & Invite Banner */}
        <div className="friends-invite-hero-banner">
          <div className="invite-hero-top">
            <div className="invite-hero-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <div className="invite-hero-text">
              <h3>Invite Telegram Friends</h3>
              <p>Send your personal link to connect friends and share reminders</p>
            </div>
          </div>

          <button
            type="button"
            className="invite-hero-share-btn"
            onClick={handleInviteFriend}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share Invite Link in Telegram</span>
          </button>
        </div>

        {/* Direct Add Friend by @username */}
        <div className="direct-add-card">
          <span className="direct-add-title">Add by Username</span>
          <div className="direct-add-input-row">
            <input
              type="text"
              className="direct-add-input"
              placeholder="Enter @username..."
              value={directUsername}
              onChange={(e) => setDirectUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDirectFriend()}
            />
            <button
              type="button"
              className="direct-add-btn"
              onClick={handleAddDirectFriend}
              disabled={!directUsername.trim() || addingLoading}
            >
              {addingLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
          {statusMessage && (
            <div className={`status-toast-msg ${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {contacts.length > 0 && (
        <div className="friends-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="friends-search-input"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Sub-tabs */}
      <div className="friends-tabs">
        <button
          className={`friends-tab ${activeSubTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('all')}
        >
          All ({contacts.length})
        </button>
        <button
          className={`friends-tab ${activeSubTab === 'connected' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('connected')}
        >
          Connected ({contacts.length})
        </button>
        <button
          className={`friends-tab ${activeSubTab === 'invite' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('invite')}
        >
          Invite
        </button>
      </div>

      {/* Friends List */}
      <div className="friends-list">
        {loading ? (
          <div className="friends-loading">
            <div className="loading-spinner"></div>
            <span>Loading contacts...</span>
          </div>
        ) : activeSubTab === 'invite' ? (
          <div className="invite-tab-content">
            <div className="invite-action-card">
              <div className="invite-action-icon">🚀</div>
              <h3 className="invite-action-title">Connect with Friends</h3>
              <p className="invite-action-desc">
                When friends open your invite link in Telegram, you will be automatically connected and can send reminders to each other.
              </p>
              <button
                type="button"
                className="invite-share-btn"
                onClick={handleInviteFriend}
              >
                Send Invite Link
              </button>
            </div>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map(contact => {
            const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.username || 'Friend';
            return (
              <div
                key={contact.userId}
                className="friend-card"
                onClick={() => onRemindFriend && onRemindFriend(contact)}
              >
                <div className="friend-avatar">
                  <img
                    src={`${config.backendUrl}/api/avatar?userId=${contact.userId}&name=${encodeURIComponent(displayName)}`}
                    alt={displayName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerText = displayName.charAt(0).toUpperCase();
                    }}
                  />
                </div>
                <div className="friend-info">
                  <div className="friend-name-row">
                    <span className="friend-name">{displayName}</span>
                    <span className="contact-status-chip connected">Connected</span>
                  </div>
                  {contact.username && (
                    <span className="friend-username">@{contact.username}</span>
                  )}
                </div>
                <div className="friend-action" onClick={(e) => e.stopPropagation()}>
                  {onRemindFriend && (
                    <button
                      type="button"
                      className="friend-remind-action-btn"
                      onClick={() => onRemindFriend(contact)}
                    >
                      Remind
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="friends-empty">
            <div className="empty-icon">👥</div>
            <p className="empty-title">No connected friends yet</p>
            <p className="empty-desc">
              Share your invite link with your Telegram friends or add them by @username above.
            </p>
            <button
              type="button"
              className="empty-invite-btn"
              onClick={handleInviteFriend}
            >
              Share Invite Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
