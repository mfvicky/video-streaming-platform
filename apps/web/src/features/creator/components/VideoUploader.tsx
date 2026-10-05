import React, { useState } from 'react';
import { uploadCreatorVideo } from '../api/creator.api';

interface VideoUploaderProps {
  onSuccess: (videoId: string) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    const formData = new FormData();
    // fetch json stringfy object and add user here
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      formData.append('creatorId', user.id);
    }
    formData.append('video', file);
    formData.append('title', title);

    try {
      const res = await uploadCreatorVideo(formData);
      if (res.success) {
        onSuccess(res.data.id);
      }
    } catch (err) {
      console.error('Upload error', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <h3 className="text-lg font-bold text-white tracking-wide">Upload Broadcast Source</h3>
        <span className="text-xs font-semibold uppercase tracking-wider text-red-500 bg-red-600/10 px-2.5 py-1 rounded-md border border-red-500/20">
          MP4 / MOV
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Video Title</label>
        <input
          type="text"
          placeholder="e.g., Cyberpunk Walkthrough 4K"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Media File</label>
        <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-xl p-6 text-center transition-all cursor-pointer">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            required
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">
              {file ? file.name : 'Click or drag video file to upload'}
            </p>
            <p className="text-xs text-slate-500">Automatic HLS Multi-Bitrate Transcoding queued on submit</p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isUploading}
        className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all transform active:scale-[0.99] cursor-pointer"
      >
        {isUploading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Uploading & Enqueuing Pipeline...
          </span>
        ) : (
          'Publish Video'
        )}
      </button>
    </form>
  );
};