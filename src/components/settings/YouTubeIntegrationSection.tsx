import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchYouTubeConfig,
  saveYouTubeConfig,
  testYouTubeConnection,
  disconnectYouTubeConfig,
  YouTubeIntegrationConfig,
  YouTubeTestResult,
} from '../../utils/youtubeAPI';
import { fetchLinkedChannels, LinkedChannel } from '../../utils/channelStorage';
import { Check, AlertCircle, Loader2, Sparkles, Play, Trash2, ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { YouTubeIcon } from '../studio/WebhooksIntegrationsView';
import '../studio/WebhooksIntegrationsView.css';

interface YouTubeConfigViewProps {
  userId?: number;
  onBack: () => void;
  onConnectionChange?: (connected: boolean) => void;
}

/* ── Live Preview: render template with placeholder or real data ── */
function renderLivePreview(
  template: string,
  testResult: YouTubeTestResult | null
): string {
  const placeholders: Record<string, string> = {
    '{title}': testResult?.latestVideo?.title || 'Your Video Title Here',
    '{url}': testResult?.latestVideo?.url || 'https://youtu.be/dQw4w9WgXcQ',
    '{description}': testResult?.latestVideo?.description
      ? testResult.latestVideo.description.slice(0, 120) + (testResult.latestVideo.description.length > 120 ? '...' : '')
      : 'Video description will appear here when you test the connection...',
    '{channel}': testResult?.channelTitle || 'Your Channel Name',
    '{thumbnail}': testResult?.latestVideo?.thumbnailUrl || '',
  };

  let html = template;
  for (const [tag, value] of Object.entries(placeholders)) {
    html = html.split(tag).join(value);
  }

  // Convert \n to <br>
  html = html.replace(/\\n/g, '<br/>');

  return html;
}

export const YouTubeConfigView: React.FC<YouTubeConfigViewProps> = ({
  userId,
  onBack,
  onConnectionChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<YouTubeTestResult | null>(null);
  const [channels, setChannels] = useState<LinkedChannel[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [channelIdInput, setChannelIdInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [targetChannelId, setTargetChannelId] = useState('');
  const [template, setTemplate] = useState(
    `🎬 <b>{title}</b>\n\n{description}\n\n👉 <b>Watch now on YouTube:</b>\n{url}`
  );
  const [attachThumbnail, setAttachThumbnail] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Load config & channels
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (userId) {
          const list = await fetchLinkedChannels(userId);
          if (mounted) setChannels(list);
        }
        const config = await fetchYouTubeConfig();
        if (mounted && config) {
          setChannelIdInput(config.youtubeChannelId || '');
          setApiKeyInput(config.youtubeApiKey || '');
          setTargetChannelId(config.targetChannelId || '');
          if (config.postTemplate) setTemplate(config.postTemplate);
          setAttachThumbnail(config.attachThumbnail);
          setAutoPublish(config.autoPublish);
          setEnabled(config.isActive);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Failed to load YouTube config:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleInsertTag = (tag: string) => {
    setTemplate((prev) => `${prev}${tag}`);
  };

  const handleTest = async () => {
    if (!channelIdInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Enter a YouTube Channel ID or @handle' });
      return;
    }
    setTesting(true);
    setStatusMessage(null);
    setTestResult(null);
    try {
      const result = await testYouTubeConnection(
        channelIdInput.trim(),
        apiKeyInput.trim() || undefined,
        template,
      );
      if (result.ok) {
        setTestResult(result);
        setStatusMessage({
          type: 'success',
          text: `Found "${result.channelTitle || result.channelId}" — preview updated!`,
        });
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Connection failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error testing connection' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!channelIdInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Channel ID or Handle is required' });
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    const configToSave: YouTubeIntegrationConfig = {
      youtubeChannelId: channelIdInput.trim(),
      youtubeApiKey: apiKeyInput.trim() || undefined,
      targetChannelId: targetChannelId || undefined,
      postTemplate: template,
      attachThumbnail,
      includeWatchButton: true,
      autoPublish,
      isActive: enabled,
    };
    const res = await saveYouTubeConfig(configToSave);
    setSaving(false);
    if (res.ok) {
      setIsConnected(true);
      onConnectionChange?.(true);
      setStatusMessage({ type: 'success', text: 'YouTube integration saved!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to save' });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect YouTube integration?')) return;
    setSaving(true);
    const ok = await disconnectYouTubeConfig();
    setSaving(false);
    if (ok) {
      setIsConnected(false);
      setEnabled(false);
      setChannelIdInput('');
      setApiKeyInput('');
      setTestResult(null);
      onConnectionChange?.(false);
      setStatusMessage({ type: 'success', text: 'YouTube disconnected' });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to disconnect' });
    }
  };

  // Memoized live preview HTML
  const previewHtml = useMemo(() => renderLivePreview(template, testResult), [template, testResult]);
  const thumbUrl = testResult?.latestVideo?.thumbnailUrl || null;

  return (
    <div className="intg-config-page animate-fade-in">
      {/* Header */}
      <div className="config-page-top-nav">
        <button type="button" className="intg-back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="config-header-brand">
          <div className="config-brand-icon yt-icon-lg">
            <YouTubeIcon size={28} />
          </div>
          <div className="config-brand-text">
            <h2 className="config-brand-title">YouTube</h2>
            <span className="config-brand-subtitle">Auto-Post on New Uploads</span>
          </div>
          <span className={`config-status-pill ${isConnected && enabled ? 'active' : 'inactive'}`}>
            {isConnected && enabled ? 'Active' : isConnected ? 'Paused' : 'Not Connected'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="config-loading">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading configuration...</span>
        </div>
      ) : (
        <div className="config-body">
          {/* Enable Toggle */}
          <div className="config-toggle-row">
            <div className="config-toggle-info">
              <span className="config-toggle-label">Enable YouTube Sync</span>
              <span className="config-toggle-hint">Detect new uploads and generate posts automatically</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span className="slider" />
            </label>
          </div>

          {enabled && (
            <div className="yt-config-layout animate-fade-in">
              {/* ═══ LEFT: Form Column ═══ */}
              <div className="yt-config-form-col">
                {/* Channel ID */}
                <div className="config-input-group">
                  <label className="config-field-label">
                    YouTube Channel <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="config-field-input"
                    placeholder="@MrBeast or UCX6OQ3DkcsbYNE6H8uQQuVA"
                    value={channelIdInput}
                    onChange={(e) => setChannelIdInput(e.target.value)}
                  />
                  <span className="config-field-hint">
                    Supports @handle, Channel ID (UC...), or channel URL.
                  </span>
                </div>

                {/* Target Channel */}
                <div className="config-input-group">
                  <label className="config-field-label">Target Telegram Channel</label>
                  {channels.length > 0 ? (
                    <select
                      className="config-field-select"
                      value={targetChannelId}
                      onChange={(e) => setTargetChannelId(e.target.value)}
                    >
                      <option value="">— Select channel —</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          📢 {ch.title} {ch.username ? `(@${ch.username})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="config-no-channels">
                      No linked channels. Connect one in Remigram Studio first.
                    </div>
                  )}
                </div>

                {/* API Key */}
                <div className="config-input-group">
                  <label className="config-field-label">
                    API Key <span className="opt">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    className="config-field-input"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                  />
                  <span className="config-field-hint">
                    If blank, Remigram uses a zero-quota public RSS engine.
                  </span>
                </div>

                {/* Template Editor */}
                <div className="config-input-group">
                  <div className="config-template-header">
                    <label className="config-field-label">Post Template</label>
                    <div className="config-tag-chips">
                      {['{title}', '{url}', '{description}', '{channel}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="config-tag-chip"
                          onClick={() => handleInsertTag(tag)}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="config-field-textarea"
                    rows={5}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    placeholder="Write your template using {title}, {url}, {description}..."
                  />
                </div>

                {/* Options */}
                <div className="config-options-grid">
                  <label className="config-checkbox-label">
                    <input
                      type="checkbox"
                      checked={attachThumbnail}
                      onChange={(e) => setAttachThumbnail(e.target.checked)}
                    />
                    <span>Attach video thumbnail as photo</span>
                  </label>
                  <label className="config-checkbox-label">
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                    />
                    <span>Auto-publish without asking</span>
                  </label>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div className={`config-status-alert ${statusMessage.type}`}>
                    {statusMessage.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="config-action-bar">
                  <button
                    type="button"
                    className="config-test-btn"
                    onClick={handleTest}
                    disabled={testing || saving}
                  >
                    {testing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    <span>Test & Preview</span>
                  </button>

                  <button
                    type="button"
                    className="config-save-btn"
                    onClick={handleSave}
                    disabled={saving || testing}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    <span>Save</span>
                  </button>

                  {isConnected && (
                    <button
                      type="button"
                      className="config-disconnect-btn"
                      onClick={handleDisconnect}
                      disabled={saving}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* ═══ RIGHT: Live Preview Column ═══ */}
              <div className="yt-config-preview-col">
                <div className="yt-preview-label">
                  <Eye size={13} />
                  <span>Live Post Preview</span>
                </div>

                <div className="tg-message-bubble">
                  {/* Thumbnail */}
                  {attachThumbnail && (
                    <div className="tg-bubble-thumb-wrap">
                      {thumbUrl ? (
                        <>
                          <img src={thumbUrl} alt="Video thumbnail" />
                          <div className="tg-bubble-play-overlay">
                            <div className="tg-bubble-play-btn">
                              <Play size={18} fill="currentColor" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="tg-bubble-play-overlay" style={{ background: 'rgba(255,0,0,0.08)' }}>
                          <div className="tg-bubble-play-btn" style={{ background: 'rgba(255,0,0,0.15)' }}>
                            <Play size={18} fill="currentColor" style={{ color: '#ff4444' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rendered Text */}
                  <div
                    className="tg-bubble-text"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />

                  {/* Inline Button */}
                  <div className="tg-bubble-button-row">
                    <div className="tg-bubble-inline-btn">
                      <ExternalLink size={13} />
                      <span>🍿 Watch on YouTube</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="tg-bubble-meta">
                    <span>via Remigram</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Keep backward-compatible export name
export const YouTubeIntegrationSection = YouTubeConfigView;
