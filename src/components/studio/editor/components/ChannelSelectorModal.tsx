import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Radio, Users, Megaphone, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { LinkedChannel, linkChannelAPI, unlinkChannelAPI } from '../../../../utils/channelStorage';
import { config } from '../../../../config';
import { OverlayPortal } from './OverlayPortal';

interface ChannelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  channels: LinkedChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: LinkedChannel | null) => void;
  onChannelsUpdated: (channels: LinkedChannel[]) => void;
}

export const ChannelSelectorModal: React.FC<ChannelSelectorModalProps> = ({
  isOpen,
  onClose,
  userId,
  channels,
  selectedChannelId,
  onSelectChannel,
  onChannelsUpdated,
}) => {
  const [chatIdentifier, setChatIdentifier] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const botName = `@${config.botUsername}`;

  const handleLinkChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatIdentifier.trim() || !userId) return;

    setIsLinking(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await linkChannelAPI(userId, chatIdentifier.trim());
      if (res.ok && res.channel) {
        setSuccessMsg(`Successfully linked "${res.channel.title}"!`);
        setChatIdentifier('');
        const updated = [res.channel, ...channels.filter(c => c.id !== res.channel!.id)];
        onChannelsUpdated(updated);
        onSelectChannel(res.channel);
        try {
          (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
        } catch {}
      } else {
        setErrorMsg(res.error || 'Failed to link. Please ensure bot is added as admin.');
        try {
          (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('error');
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Unlink this channel? Posts can no longer be sent to it.')) return;

    const ok = await unlinkChannelAPI(channelId, userId);
    if (ok) {
      const updated = channels.filter(c => c.id !== channelId);
      onChannelsUpdated(updated);
      if (selectedChannelId === channelId) {
        onSelectChannel(null);
      }
      try {
        (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning');
      } catch {}
    }
  };

  return (
    <OverlayPortal>
      <AnimatePresence>
        <div className="channel-modal-backdrop" onClick={onClose}>
        <motion.div
          className="channel-modal-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="channel-modal-header">
            <div className="channel-modal-title-row">
              <div className="channel-modal-icon-badge">
                <Megaphone size={18} />
              </div>
              <div>
                <h3 className="channel-modal-title">Publish Destination</h3>
                <p className="channel-modal-sub">Link Telegram channels or groups to post directly</p>
              </div>
            </div>
            <button type="button" className="channel-modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Instructions Notice */}
          <div className="channel-modal-hint-card">
            <div className="hint-header">
              <Radio size={14} className="hint-pulse-icon" />
              <span>How to connect:</span>
            </div>
            <ol className="hint-list">
              <li>Add <b>{botName}</b> as an <b>Administrator</b> with posting rights in your channel/group.</li>
              <li>Type your channel's public link or username below (e.g. <code>@my_channel</code>).</li>
            </ol>
          </div>

          {/* Add Channel Form */}
          <form className="channel-link-form" onSubmit={handleLinkChannel}>
            <div className="channel-input-wrap">
              <input
                type="text"
                className="channel-text-input"
                placeholder="@my_channel or channel link"
                value={chatIdentifier}
                onChange={(e) => {
                  setChatIdentifier(e.target.value);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                disabled={isLinking}
              />
              <button
                type="submit"
                className="channel-link-submit-btn"
                disabled={isLinking || !chatIdentifier.trim()}
              >
                {isLinking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Link</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Alerts */}
          {errorMsg && (
            <div className="channel-modal-alert error">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="channel-modal-alert success">
              <CheckCircle size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Channels List */}
          <div className="channel-modal-list-section">
            <div className="channel-modal-list-title">
              <span>Your Destinations</span>
              <span className="channels-count-badge">{channels.length}</span>
            </div>

            {/* None / Draft option */}
            <div
              className={`channel-item-card ${selectedChannelId === null ? 'active' : ''}`}
              onClick={() => {
                onSelectChannel(null);
                try {
                  (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
                } catch {}
              }}
            >
              <div className="channel-item-left">
                <div className="channel-item-avatar draft">??</div>
                <div className="channel-item-info">
                  <span className="channel-item-name">Draft only (No destination)</span>
                  <span className="channel-item-handle">Keep in editor without publishing</span>
                </div>
              </div>
              <div className="channel-radio-indicator">
                {selectedChannelId === null && <div className="channel-radio-dot" />}
              </div>
            </div>

            {/* Linked Channels */}
            {channels.map((ch) => {
              const isSelected = selectedChannelId === ch.id;
              const isChannel = ch.chat_type === 'channel';

              return (
                <div
                  key={ch.id}
                  className={`channel-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectChannel(ch);
                    try {
                      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
                    } catch {}
                  }}
                >
                  <div className="channel-item-left">
                    <div className={`channel-item-avatar ${isChannel ? 'channel' : 'group'}`}>
                      {isChannel ? <Megaphone size={16} /> : <Users size={16} />}
                    </div>
                    <div className="channel-item-info">
                      <span className="channel-item-name">{ch.title}</span>
                      <span className="channel-item-handle">
                        {ch.username ? `@${ch.username}` : `ID: ${ch.chat_id}`}
                      </span>
                    </div>
                  </div>

                  <div className="channel-item-right">
                    <button
                      type="button"
                      className="channel-unlink-btn"
                      title="Unlink channel"
                      onClick={(e) => handleUnlink(ch.id, e)}
                    >
                      <Trash2 size={15} />
                    </button>
                    <div className="channel-radio-indicator">
                      {isSelected && <div className="channel-radio-dot" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  </OverlayPortal>
  );
};
