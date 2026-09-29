import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
}

interface QualityLevel {
  id: number;
  height: number;
  bitrate: number;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ src }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      // Listen for available quality levels once master manifest parsed
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const availableLevels: QualityLevel[] = data.levels.map((level, index) => ({
          id: index,
          height: level.height,
          bitrate: level.bitrate,
        }));

        setLevels(availableLevels);
      });

      // Track active quality level switches (when set to Auto)
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.currentLevel === -1) {
          // Keep state synced with current adaptive level
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari / iOS) handles adaptive bitrate internally
      video.src = src;
    }
  }, [src]);

  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex; // Set to -1 for Auto, or specific index
    setCurrentLevel(levelIndex);
  };

  return (
    <div className="w-full max-w-3xl rounded-xl overflow-hidden bg-black shadow-lg flex flex-col">
      <div className="relative w-full aspect-video">
        <video ref={videoRef} controls className="w-full h-full" />
      </div>

      {/* Quality Switcher Bar */}
      {levels.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 text-white text-sm">
          <span className="font-medium text-neutral-400">Quality:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQualityChange(-1)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                currentLevel === -1
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Auto
            </button>
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => handleQualityChange(lvl.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  currentLevel === lvl.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {lvl.height ? `${lvl.height}p` : `Level ${lvl.id}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};