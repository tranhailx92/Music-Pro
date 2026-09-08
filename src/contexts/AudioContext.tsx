import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface AudioState {
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTrackTitle: string;
  currentTrackArtist: string;
}

interface AudioContextType extends AudioState {
  togglePlay: () => void;
  seek: (value: number) => void;
  setTrack: (title: string, artist: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(180); // Mock duration: 3:00
  const [currentTrackTitle, setCurrentTrackTitle] = useState('Chưa có bài hát');
  const [currentTrackArtist, setCurrentTrackArtist] = useState('Chọn một bản nhạc để phát');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const seek = (value: number) => {
    setProgress(value);
  };

  const setTrack = (title: string, artist: string) => {
    setCurrentTrackTitle(title);
    setCurrentTrackArtist(artist);
    setProgress(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, duration]);

  return (
    <AudioContext.Provider value={{ 
      isPlaying, 
      progress, 
      duration, 
      currentTrackTitle, 
      currentTrackArtist,
      togglePlay, 
      seek,
      setTrack
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
