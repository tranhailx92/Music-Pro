import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music2, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { useAudio } from '../contexts/AudioContext';

interface NowPlayingBarProps {
  onMenuClick: () => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ onMenuClick }) => {
  const { 
    isPlaying, 
    progress, 
    duration, 
    currentTrackTitle, 
    currentTrackArtist,
    togglePlay, 
    seek 
  } = useAudio();

  return (
    <div className="h-16 flex items-center justify-between px-3 md:px-4 bg-zinc-950/50 backdrop-blur-xl border-b border-white/5 shrink-0 z-40">
      <div className="flex items-center gap-2">
        <button 
          onClick={onMenuClick}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h4 className="text-xs font-bold text-white truncate">{currentTrackTitle}</h4>
            <p className="text-[10px] text-zinc-500 truncate">{currentTrackArtist}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-3 px-2">
        <button 
          onClick={togglePlay}
          className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="hidden md:flex flex-1 items-center gap-2 max-w-xs">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full relative group cursor-pointer overflow-hidden">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              initial={false}
              animate={{ width: `${(progress / duration) * 100}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            />
            <input 
              type="range"
              min="0"
              max={duration}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="w-10" />
    </div>
  );
};
