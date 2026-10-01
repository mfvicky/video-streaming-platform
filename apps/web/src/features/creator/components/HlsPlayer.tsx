import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  poster?: string;
}

interface QualityLevel {
  id: number;
  height: number;
  bitrate: number;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ src, poster }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto
  
  // Track whether the video has started playback at least once
  const [hasStartedPlaying, setHasStartedPlaying] = useState<boolean>(false);
  const [posterError, setPosterError] = useState<boolean>(false);

  useEffect(() => {
    // Reset play and error state when stream or poster source changes
    setHasStartedPlaying(false);
    setPosterError(false);

    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const availableLevels: QualityLevel[] = data.levels.map((level, index) => ({
          id: index,
          height: level.height,
          bitrate: level.bitrate,
        }));

        setLevels(availableLevels);
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src, poster]);

  const handleStartPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    setHasStartedPlaying(true);
    video.play().catch((err) => console.error('Playback trigger error:', err));
  };

  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  };

  const hasValidPoster = Boolean(poster) && !posterError;
  // Show custom overlay only before initial playback has started
  const showCustomOverlay = !hasStartedPlaying && hasValidPoster;

  return (
    <div className="w-full max-w-3xl rounded-xl overflow-hidden bg-black shadow-lg flex flex-col">
      <div className="relative w-full aspect-video group">
        <video
          ref={videoRef}
          controls={!showCustomOverlay}
          poster={hasValidPoster ? poster : undefined}
          onPlay={() => setHasStartedPlaying(true)}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full object-contain bg-black"
        />

        {/* Custom Interactive Poster Overlay (Only shown prior to initial playback) */}
        {showCustomOverlay && (
          <div
            onClick={handleStartPlay}
            className="absolute inset-0 bg-cover bg-center flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:brightness-90"
            style={{ backgroundImage: `url(${poster})` }}
          >
            {/* Hidden image element to detect broken poster URLs */}
            <img
              src={poster}
              alt=""
              className="hidden"
              onError={() => setPosterError(true)}
            />

            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <button
              type="button"
              className="relative z-10 w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110"
              aria-label="Play Video"
            >
              <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Quality Switcher Bar */}
      {levels.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 text-white text-sm">
          <span className="font-medium text-neutral-400">Quality:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
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
                type="button"
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