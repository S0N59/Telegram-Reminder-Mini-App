import { MediaItem, FilePostBlock } from '../types/composer';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function createMediaItemFromFile(file: File): Promise<MediaItem> {
  const url = await readFileAsDataUrl(file);
  const isVideo = file.type.startsWith('video/');

  return {
    id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    url,
    type: isVideo ? 'video' : 'image',
    name: file.name,
    size: file.size,
  };
}

export function createFileBlockFromFile(file: File): FilePostBlock {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
  return {
    id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: 'file',
    name: file.name,
    size: file.size,
    extension: ext,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
