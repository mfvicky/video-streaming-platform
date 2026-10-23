import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { uploadCreatorVideo } from '../api/creator.api';

interface Props {
  onSuccess: (videoId: string) => void;
}
interface Item {
  id: string;
  file: File;
  title: string;
  status: 'queued' | 'uploading' | 'processing' | 'failed';
  progress: number;
  error?: string;
}
const SIZE_LIMIT = 1024 * 1024 * 1024; // Existing API limit: 1 GiB per file.
const MAX_CONCURRENT = 2; // Avoid launching too many simultaneous 1GB uploads.
const nameWithoutExtension = (name: string) =>
  name.replace(/\.[^.]+$/, '') || 'Untitled Video';

export const VideoUploader: React.FC<Props> = ({ onSuccess }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const update = useCallback((id: string, patch: Partial<Item>) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);
  const addFiles = (files: FileList | File[]) => {
    const selected = Array.from(files);
    const valid = selected.filter(
      (file) =>
        (file.type.startsWith('video/') ||
          /\.(mp4|mov|mkv|webm|avi)$/i.test(file.name)) &&
        file.size > 0 &&
        file.size <= SIZE_LIMIT,
    );
    if (valid.length !== selected.length)
      setError(
        'Some files were skipped (unsupported format, empty, or over 1 GiB).',
      );
    else setError('');
    setItems((previous) => [
      ...previous,
      ...valid.map((file) => ({
        id: uuidv4(),
        file,
        title: nameWithoutExtension(file.name),
        status: 'queued' as const,
        progress: 0,
      })),
    ]);
  };
  const uploadAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    const remaining = items.filter(
      (item) => item.status === 'queued' || item.status === 'failed',
    );
    if (!remaining.length) return;
    setUploading(true);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < remaining.length) {
        const item = remaining[nextIndex++];
        if (!item.title.trim()) {
          update(item.id, { status: 'failed', error: 'Title is required' });
          continue;
        }
        update(item.id, { status: 'uploading', progress: 0, error: undefined });
        const form = new FormData();
        form.append('title', item.title.trim());
        form.append('video', item.file);
        try {
          const response = await uploadCreatorVideo(form, (percent) =>
            update(item.id, { progress: percent }),
          );
          if (!response?.success || !response?.data?.id)
            throw new Error('Server did not confirm upload');
          update(item.id, { status: 'processing', progress: 100 });
          onSuccess(response.data.id);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          update(item.id, { status: 'failed', error: message });
        }
      }
    };
    try {
      await Promise.all(
        Array.from({ length: Math.min(MAX_CONCURRENT, remaining.length) }, () =>
          worker(),
        ),
      );
    } finally {
      setUploading(false);
    }
  };
  return (
    <form
      onSubmit={uploadAll}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
    >
      <h3 className="text-lg font-bold text-white">Upload Videos</h3>
      <p className="text-xs text-slate-400">
        Choose multiple files or drop videos here. Up to two files upload
        simultaneously; each video is processed by RabbitMQ afterwards.
      </p>
      <div
        className={`relative border-2 border-dashed ${dragging ? 'border-red-500' : 'border-slate-700'} rounded-xl bg-slate-950 p-6 text-center`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          accept="video/*,.mkv,.avi"
          disabled={uploading}
          aria-label="Select multiple videos"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
        />
        <p className="text-sm font-semibold text-slate-200">
          Drop videos here or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">
          MP4 / MOV / MKV / WebM · Max 1 GiB each
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="border border-slate-800 rounded-lg p-3 space-y-2"
          >
            <div className="flex gap-2 items-center">
              <input
                aria-label={`Title for ${item.file.name}`}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                value={item.title}
                disabled={item.status !== 'queued' && item.status !== 'failed'}
                onChange={(e) => update(item.id, { title: e.target.value })}
              />
              <span className="text-xs text-slate-400">
                {item.status === 'processing'
                  ? 'Queued for encoding'
                  : item.status}
              </span>
              {!uploading && item.status !== 'uploading' && (
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  className="text-xs text-red-400"
                  onClick={() =>
                    setItems((previous) =>
                      previous.filter((p) => p.id !== item.id),
                    )
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {item.file.name} · {(item.file.size / 1048576).toFixed(1)} MB
            </p>
            <div
              role="progressbar"
              aria-label={`Upload progress for ${item.file.name}`}
              aria-valuenow={item.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 rounded bg-slate-800 overflow-hidden"
            >
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            {item.error && <p className="text-xs text-red-400">{item.error}</p>}
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={
          uploading ||
          !items.some(
            (item) => item.status === 'queued' || item.status === 'failed',
          )
        }
        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold"
      >
        {uploading
          ? 'Uploading selected videos…'
          : `Upload ${items.filter((item) => item.status === 'queued' || item.status === 'failed').length} video(s)`}
      </button>
    </form>
  );
};
