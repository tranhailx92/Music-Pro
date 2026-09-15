import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileAudio, FileMusic, Loader2, Pause, Play, Square } from 'lucide-react';
import { renderTimelineToWavBlob } from '../audio/offline-render';
import { useAudio } from '../contexts/AudioContext';
import { timelineToMidiBlob } from '../music/midi-export';
import { getCurrentMeasure, parseMusicXMLToTimeline } from '../music/score-timeline';
import { scoreTrackId } from '../music/score-id';

interface ScorePlayerProps {
  xmlContent: string;
  title: string;
  artist?: string;
  filenameBase?: string;
  showMusicXmlDownload?: boolean;
  onCurrentMeasureChange?: (measure: number | undefined) => void;
}

function sanitizeFilename(value: string): string {
  return (value || 'music-pro-song')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'music-pro-song';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const rounded = Math.floor(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

export const ScorePlayer: React.FC<ScorePlayerProps> = ({
  xmlContent,
  title,
  artist = 'Music-Pro Score Preview',
  filenameBase,
  showMusicXmlDownload = true,
  onCurrentMeasureChange,
}) => {
  const audio = useAudio();
  const [renderingWav, setRenderingWav] = useState(false);
  const [preparingAudio, setPreparingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackId = useMemo(() => scoreTrackId(xmlContent), [xmlContent]);
  const timelineResult = useMemo(() => {
    try {
      return { timeline: parseMusicXMLToTimeline(xmlContent), error: null as string | null };
    } catch (cause: any) {
      return { timeline: null, error: cause?.message || 'Không thể đọc MusicXML để phát.' };
    }
  }, [xmlContent]);

  const timeline = timelineResult.timeline;
  const active = audio.currentTrackId === trackId;
  const progress = active ? audio.progress : 0;
  const currentMeasure = timeline && active ? getCurrentMeasure(timeline, progress) : undefined;
  const base = sanitizeFilename(filenameBase || title || timeline?.title || 'music-pro-song');

  useEffect(() => {
    let cancelled = false;
    if (!timeline || audio.currentTrackId === trackId) {
      setPreparingAudio(false);
      return;
    }

    setPreparingAudio(true);
    setError(null);
    void audio
      .loadMusicXml(xmlContent, title || timeline.title || 'Music-Pro', artist, false, trackId)
      .catch((cause: any) => {
        if (!cancelled) setError(cause?.message || 'Không thể chuẩn bị âm thanh để phát.');
      })
      .finally(() => {
        if (!cancelled) setPreparingAudio(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist, audio.currentTrackId, audio.loadMusicXml, timeline, title, trackId, xmlContent]);

  useEffect(() => {
    onCurrentMeasureChange?.(currentMeasure);
  }, [currentMeasure, onCurrentMeasureChange]);

  const handlePlayPause = async () => {
    setError(null);
    try {
      if (!timeline) throw new Error(timelineResult.error || 'MusicXML không hợp lệ.');
      if (active) await audio.togglePlay();
      else await audio.loadMusicXml(xmlContent, title || timeline.title || 'Music-Pro', artist, true, trackId);
    } catch (cause: any) {
      setError(cause?.message || 'Không thể phát bản nhạc.');
    }
  };

  const handleStop = () => {
    if (active) audio.stop();
  };

  const handleMidi = () => {
    setError(null);
    try {
      if (!timeline) throw new Error(timelineResult.error || 'MusicXML không hợp lệ.');
      downloadBlob(timelineToMidiBlob(timeline), `${base}.mid`);
    } catch (cause: any) {
      setError(cause?.message || 'Không thể xuất MIDI.');
    }
  };

  const handleWav = async () => {
    setRenderingWav(true);
    setError(null);
    try {
      if (!timeline) throw new Error(timelineResult.error || 'MusicXML không hợp lệ.');
      const blob = await renderTimelineToWavBlob(timeline);
      downloadBlob(blob, `${base}_demo.wav`);
    } catch (cause: any) {
      setError(cause?.message || 'Không thể kết xuất WAV.');
    } finally {
      setRenderingWav(false);
    }
  };

  const handleMusicXml = () => {
    downloadBlob(
      new Blob([xmlContent], { type: 'application/vnd.recordare.musicxml+xml' }),
      `${base}.musicxml`,
    );
  };

  if (!timeline) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        {timelineResult.error}
      </div>
    );
  }

  const bpm = Math.round(timeline.tempoMap[0]?.bpm || 120);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="font-bold text-white truncate">{title || timeline.title || 'Bản nhạc Music-Pro'}</div>
          <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>{bpm} BPM</span>
            <span>{timeline.parts.length} bè/nhạc cụ</span>
            <span>{formatTime(timeline.totalDurationSeconds)}</span>
            {currentMeasure !== undefined && <span>Ô nhịp {currentMeasure}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePlayPause}
            disabled={preparingAudio}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-60"
          >
            {preparingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : active && audio.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {preparingAudio ? 'Đang chuẩn bị…' : active && audio.isPlaying ? 'Tạm dừng' : 'Nghe bản nhạc'}
          </button>
          <button
            onClick={handleStop}
            disabled={!active}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 disabled:opacity-40"
          >
            <Square className="w-4 h-4" /> Dừng
          </button>
          <button
            onClick={handleMidi}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            <FileMusic className="w-4 h-4" /> MIDI
          </button>
          <button
            onClick={handleWav}
            disabled={renderingWav}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            {renderingWav ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileAudio className="w-4 h-4" />}
            WAV demo
          </button>
          {showMusicXmlDownload && (
            <button
              onClick={handleMusicXml}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
            >
              <Download className="w-4 h-4" /> MusicXML
            </button>
          )}
        </div>
      </div>

      {active && (
        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="tabular-nums">{formatTime(audio.progress)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(0.01, audio.duration)}
            step={0.05}
            value={Math.min(audio.progress, Math.max(0.01, audio.duration))}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => void audio.seek(Number(event.target.value))}
            className="flex-1 accent-indigo-500"
            aria-label="Vị trí phát"
          />
          <span className="tabular-nums">{formatTime(audio.duration)}</span>
        </div>
      )}

      {(error || timelineResult.error) && (
        <div className="text-xs text-red-300">{error || timelineResult.error}</div>
      )}
      <p className="text-[11px] leading-relaxed text-zinc-600">
        Score Preview phát trực tiếp từ MusicXML nên ưu tiên đúng nốt, tiết tấu và tempo. WAV là bản demo tổng hợp trong trình duyệt; bản thu AI phía dưới là lớp sản xuất riêng.
      </p>
    </div>
  );
};
