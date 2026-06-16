import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, FastForward, Rewind } from 'lucide-react';

const VideoPlayer = ({ src, className = "" }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null); // { type: 'forward' | 'backward', id: number }

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      if (total) {
        setProgress((current / total) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const percentage = Math.max(0, Math.min(100, (x / bounds.width) * 100));
      const newTime = (percentage / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(percentage);
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlaybackRateChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const formatTime = (timeInSeconds) => {
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 2500);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Double tap to seek logic
  const handleDoubleClick = (e, direction) => {
    e.preventDefault();
    if (videoRef.current) {
      const skipAmount = 10;
      if (direction === 'forward') {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + skipAmount);
        setSeekIndicator({ type: 'forward', id: Date.now() });
      } else {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipAmount);
        setSeekIndicator({ type: 'backward', id: Date.now() });
      }
      setTimeout(() => setSeekIndicator(null), 500);
      resetControlsTimeout();
    }
  };

  const handleVideoClick = (e) => {
    if (e.detail === 2) {
      // It's a double click
      const bounds = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      if (x > bounds.width / 2) {
        handleDoubleClick(e, 'forward');
      } else {
        handleDoubleClick(e, 'backward');
      }
    } else if (e.detail === 1) {
      // Single click, toggle play/pause after a short delay
      setTimeout(() => {
        // Simple approach to avoid triggering single click logic on double clicks if we had a pure double click listener
      }, 200);
      togglePlay();
      resetControlsTimeout();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative flex items-center justify-center bg-black overflow-hidden select-none group w-fit h-fit rounded ${isFullscreen ? 'w-full h-full' : ''}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        className={`max-w-full ${isFullscreen ? 'w-full h-full object-contain' : 'object-contain ' + (className || '')}`}
        onClick={handleVideoClick}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />

      {/* Seek Indicators */}
      {seekIndicator && (
        <div 
          key={seekIndicator.id}
          className={`absolute top-1/2 -translate-y-1/2 p-4 bg-black/50 rounded-full text-white animate-pulse flex flex-col items-center pointer-events-none
          ${seekIndicator.type === 'forward' ? 'right-1/4' : 'left-1/4'}`}
        >
          {seekIndicator.type === 'forward' ? <FastForward size={32} /> : <Rewind size={32} />}
          <span className="text-sm font-bold">10s</span>
        </div>
      )}

      {/* Center Play Button (Large, fades out) */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black/40 p-4 rounded-full text-white backdrop-blur-sm transition-opacity">
            <Play size={48} className="ml-2" />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 transition-opacity duration-300
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Progress Bar */}
        <div 
          className="relative h-1.5 bg-gray-600 rounded cursor-pointer mb-4 group/progress"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-blue-500 rounded group-hover/progress:bg-blue-400 transition-colors"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow transition-transform scale-0 group-hover/progress:scale-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-blue-400 transition-colors">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            {/* Volume */}
            <div className="flex items-center gap-2 group/volume relative">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-blue-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-blue-500 cursor-pointer h-1.5"
              />
            </div>

            {/* Time */}
            <div className="text-sm font-medium tabular-nums tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Settings / Speed */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                className={`hover:text-blue-400 transition-colors ${showSettings ? 'text-blue-400' : ''} ${playbackRate !== 1 ? 'font-bold' : ''}`}
              >
                {playbackRate === 1 ? <Settings size={20} /> : <span className="text-sm">{playbackRate}x</span>}
              </button>
              
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-4 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg p-2 min-w-[120px] flex flex-col gap-1 z-50">
                  <div className="text-xs text-gray-400 font-semibold px-2 py-1 mb-1 border-b border-white/10 uppercase tracking-wider">Speed</div>
                  {[0.5, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={(e) => { e.stopPropagation(); handlePlaybackRateChange(rate); }}
                      className={`text-left px-3 py-1.5 text-sm rounded hover:bg-white/10 transition-colors ${playbackRate === rate ? 'text-blue-400 font-medium' : 'text-gray-200'}`}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-blue-400 transition-colors">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
