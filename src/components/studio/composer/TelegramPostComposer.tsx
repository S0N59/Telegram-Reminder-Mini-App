import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Plus } from 'lucide-react';

import {
  PostDocument,
  PostBlock,
  TextPostBlock,
  MediaGalleryPostBlock,
  QuotePostBlock,
  CodePostBlock,
  FilePostBlock,
  ComposerSaveState,
  MediaItem,
} from './types/composer';
import { serializePostDocument } from './utils/composerSerialization';
import { createMediaItemFromFile, createFileBlockFromFile } from './utils/fileUpload';
import { ComposerHeader } from './components/ComposerHeader';
import { UniversalAddMenu } from './components/UniversalAddMenu';
import { BlockWrapper } from './components/BlockWrapper';
import { TextBlock } from './components/blocks/TextBlock';
import { MediaGalleryBlock } from './components/blocks/MediaGalleryBlock';
import { QuoteBlock } from './components/blocks/QuoteBlock';
import { CodeBlock } from './components/blocks/CodeBlock';
import { FileBlock } from './components/blocks/FileBlock';
import { TelegramComposerPreview } from './components/TelegramComposerPreview';
import './TelegramPostComposer.css';

interface TelegramPostComposerProps {
  onBack: () => void;
  accentColor?: string;
}

const STORAGE_KEY = 'remigram_studio_composer_draft_v2';

const INITIAL_BLOCKS: PostBlock[] = [
  {
    id: 'b_init_1',
    type: 'text',
    content:
      '<p>🚀 <b>Welcome to Remigram Telegram Post Composer!</b></p><p>This is your unified workspace for creating professional Telegram posts. Click <b>+</b> below to add photo albums, files, quotes, or code blocks!</p>',
  },
];

export const TelegramPostComposer: React.FC<TelegramPostComposerProps> = ({
  onBack,
  accentColor = 'lime',
}) => {
  // Document State
  const [doc, setDoc] = useState<PostDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.blocks)) return parsed;
      }
    } catch {}
    return {
      id: 'doc_' + Date.now(),
      title: 'New Telegram Post',
      blocks: INITIAL_BLOCKS,
      updatedAt: Date.now(),
    };
  });

  // UI States
  const [saveState, setSaveState] = useState<ComposerSaveState>('saved');
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 960);
  const [isSplitPreviewOpen, setIsSplitPreviewOpen] = useState<boolean>(() => window.innerWidth >= 1200);
  const [isMobilePreviewSheetOpen, setIsMobilePreviewSheetOpen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile && window.innerWidth >= 1200) {
        setIsSplitPreviewOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Autosave trigger
  const triggerAutosave = (updatedDoc: PostDocument) => {
    setDoc(updatedDoc);
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDoc));
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
      }
    }, 800);
  };

  // Serialized calculations
  const serialized = serializePostDocument(doc);

  // Block Mutations
  const updateBlock = (id: string, updater: (block: PostBlock) => PostBlock) => {
    const newBlocks = doc.blocks.map((b) => (b.id === id ? updater(b) : b));
    triggerAutosave({ ...doc, blocks: newBlocks, updatedAt: Date.now() });
  };

  const removeBlock = (id: string) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning');
    } catch {}
    const newBlocks = doc.blocks.filter((b) => b.id !== id);
    // Always keep at least 1 text block
    if (newBlocks.length === 0) {
      newBlocks.push({
        id: 'block_' + Date.now(),
        type: 'text',
        content: '<p></p>',
      });
    }
    triggerAutosave({ ...doc, blocks: newBlocks, updatedAt: Date.now() });
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= doc.blocks.length) return;
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
    } catch {}
    const newBlocks = [...doc.blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    triggerAutosave({ ...doc, blocks: newBlocks, updatedAt: Date.now() });
  };

  const duplicateBlock = (id: string) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    const idx = doc.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const target = doc.blocks[idx];
    const clone: PostBlock = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    };
    const newBlocks = [...doc.blocks];
    newBlocks.splice(idx + 1, 0, clone);
    triggerAutosave({ ...doc, blocks: newBlocks, updatedAt: Date.now() });
  };

  // Add Block Handlers
  const handleAddImages = async (files: FileList) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
    const items: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = await createMediaItemFromFile(files[i]);
      items.push(item);
    }
    const newBlock: MediaGalleryPostBlock = {
      id: 'media_' + Date.now(),
      type: 'media_gallery',
      items: items.slice(0, 10),
      caption: '',
    };
    triggerAutosave({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: Date.now() });
  };

  const handleAddFile = (file: File) => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
    const newBlock = createFileBlockFromFile(file);
    triggerAutosave({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: Date.now() });
  };

  const handleAddQuote = () => {
    const newBlock: QuotePostBlock = {
      id: 'quote_' + Date.now(),
      type: 'quote',
      text: '',
      author: '',
    };
    triggerAutosave({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: Date.now() });
  };

  const handleAddCode = () => {
    const newBlock: CodePostBlock = {
      id: 'code_' + Date.now(),
      type: 'code',
      code: '',
      language: 'python',
    };
    triggerAutosave({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: Date.now() });
  };

  const handleAddText = () => {
    const newBlock: TextPostBlock = {
      id: 'text_' + Date.now(),
      type: 'text',
      content: '<p></p>',
    };
    triggerAutosave({ ...doc, blocks: [...doc.blocks, newBlock], updatedAt: Date.now() });
  };

  // Drag & Drop Files onto Workspace
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles: File[] = [];
      const otherFiles: File[] = [];

      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
          imageFiles.push(f);
        } else {
          otherFiles.push(f);
        }
      }

      if (imageFiles.length > 0) {
        const dt = new DataTransfer();
        imageFiles.forEach((f) => dt.items.add(f));
        await handleAddImages(dt.files);
      }

      otherFiles.forEach((f) => handleAddFile(f));
    }
  };

  // Clear Post
  const handleClearPost = () => {
    if (window.confirm('Clear entire post and start fresh?')) {
      const freshDoc: PostDocument = {
        id: 'doc_' + Date.now(),
        title: 'New Telegram Post',
        blocks: [
          {
            id: 'block_' + Date.now(),
            type: 'text',
            content: '<p></p>',
          },
        ],
        updatedAt: Date.now(),
      };
      localStorage.removeItem(STORAGE_KEY);
      triggerAutosave(freshDoc);
    }
  };

  // Copy Format
  const handleCopyFormat = (format: 'html' | 'markdown' | 'text') => {
    let textToCopy = '';
    if (format === 'html') textToCopy = serialized.html;
    else if (format === 'markdown') textToCopy = serialized.markdownV2;
    else textToCopy = serialized.plainText;

    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
    } catch {}
  };

  // Toggle Preview
  const handleTogglePreview = () => {
    try {
      (window as any)?.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    } catch {}
    if (isMobile) {
      setIsMobilePreviewSheetOpen((v) => !v);
    } else {
      setIsSplitPreviewOpen((v) => !v);
    }
  };

  return (
    <div
      className={`telegram-post-composer-page ${isDraggingOver ? 'dragging-file-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Drag & Drop Overlay Indicator ── */}
      {isDraggingOver && (
        <div className="composer-drop-overlay">
          <div className="drop-overlay-card">
            <Plus size={32} className="drop-pulse-icon" />
            <span className="drop-title">Drop images or files here</span>
            <span className="drop-subtitle">Automatically added to your Telegram post</span>
          </div>
        </div>
      )}

      {/* ── Top Header ── */}
      <ComposerHeader
        onBack={onBack}
        title={doc.title}
        onTitleChange={(newTitle) => triggerAutosave({ ...doc, title: newTitle })}
        saveState={saveState}
        serialized={serialized}
        onTogglePreview={handleTogglePreview}
        isPreviewOpen={isMobile ? isMobilePreviewSheetOpen : isSplitPreviewOpen}
        onClearPost={handleClearPost}
        onCopyFormat={handleCopyFormat}
      />

      {/* ── Workspace Main Area ── */}
      <div
        className={`composer-workspace-container ${
          isSplitPreviewOpen && !isMobile ? 'split-layout-active' : 'single-layout'
        }`}
      >
        {/* Editor Stream */}
        <div className="composer-editor-stream">
          <div className="composer-blocks-list">
            {doc.blocks.map((block, index) => (
              <BlockWrapper
                key={block.id}
                id={block.id}
                index={index}
                totalBlocks={doc.blocks.length}
                onMoveUp={() => moveBlock(index, index - 1)}
                onMoveDown={() => moveBlock(index, index + 1)}
                onDuplicate={() => duplicateBlock(block.id)}
                onDelete={() => removeBlock(block.id)}
              >
                {block.type === 'text' && (
                  <TextBlock
                    id={block.id}
                    content={block.content}
                    onChange={(newContent) =>
                      updateBlock(block.id, (b) => ({ ...(b as TextPostBlock), content: newContent }))
                    }
                  />
                )}

                {block.type === 'media_gallery' && (
                  <MediaGalleryBlock
                    id={block.id}
                    items={block.items}
                    caption={block.caption}
                    onUpdateItems={(newItems) =>
                      updateBlock(block.id, (b) => ({
                        ...(b as MediaGalleryPostBlock),
                        items: newItems,
                      }))
                    }
                    onUpdateCaption={(newCaption) =>
                      updateBlock(block.id, (b) => ({
                        ...(b as MediaGalleryPostBlock),
                        caption: newCaption,
                      }))
                    }
                  />
                )}

                {block.type === 'quote' && (
                  <QuoteBlock
                    id={block.id}
                    text={block.text}
                    author={block.author}
                    onUpdateText={(newText) =>
                      updateBlock(block.id, (b) => ({ ...(b as QuotePostBlock), text: newText }))
                    }
                    onUpdateAuthor={(newAuthor) =>
                      updateBlock(block.id, (b) => ({ ...(b as QuotePostBlock), author: newAuthor }))
                    }
                  />
                )}

                {block.type === 'code' && (
                  <CodeBlock
                    id={block.id}
                    code={block.code}
                    language={block.language}
                    onUpdateCode={(newCode) =>
                      updateBlock(block.id, (b) => ({ ...(b as CodePostBlock), code: newCode }))
                    }
                    onUpdateLanguage={(newLang) =>
                      updateBlock(block.id, (b) => ({ ...(b as CodePostBlock), language: newLang }))
                    }
                  />
                )}

                {block.type === 'file' && (
                  <FileBlock
                    id={block.id}
                    name={block.name}
                    size={block.size}
                    extension={block.extension}
                    onRemove={() => removeBlock(block.id)}
                  />
                )}
              </BlockWrapper>
            ))}
          </div>

          {/* Universal Add Menu at bottom of blocks */}
          <div className="composer-stream-footer">
            <UniversalAddMenu
              onAddImages={handleAddImages}
              onAddFile={handleAddFile}
              onAddQuote={handleAddQuote}
              onAddCode={handleAddCode}
              onAddText={handleAddText}
            />
          </div>
        </div>

        {/* Desktop Split View Live Preview */}
        {!isMobile && isSplitPreviewOpen && (
          <div className="composer-split-preview-pane animate-fade-in">
            <TelegramComposerPreview
              document={doc}
              serialized={serialized}
              onCopyFormat={handleCopyFormat}
            />
          </div>
        )}
      </div>

      {/* ── Mobile Preview Sheet Modal ── */}
      <AnimatePresence>
        {isMobile && isMobilePreviewSheetOpen && (
          <div
            className="composer-mobile-sheet-backdrop"
            onClick={() => setIsMobilePreviewSheetOpen(false)}
          >
            <motion.div
              className="composer-mobile-sheet-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              <div className="sheet-drag-bar" />
              <div className="sheet-top-header">
                <div>
                  <span className="sheet-title">Telegram Post Preview</span>
                  <span className="sheet-desc">Authentic post visualization</span>
                </div>
                <button
                  type="button"
                  className="sheet-close-round-btn"
                  onClick={() => setIsMobilePreviewSheetOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="sheet-scroll-body">
                <TelegramComposerPreview
                  document={doc}
                  serialized={serialized}
                  onCopyFormat={handleCopyFormat}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
