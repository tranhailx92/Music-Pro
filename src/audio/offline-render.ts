import type { ScoreTimeline } from '../music/score-timeline';
import { quarterToSeconds } from '../music/score-timeline';
import { scheduleSynthNote } from './synth';

export interface WavRenderOptions {
  sampleRate?: number;
  channels?: 1 | 2;
  tailSeconds?: number;
}

export async function renderTimelineToWavBlob(
  timeline: ScoreTimeline,
  options: WavRenderOptions = {},
): Promise<Blob> {
  const sampleRate = Math.max(22050, Math.min(44100, Math.round(options.sampleRate || 32000)));
  const channels = options.channels || 1;
  const tailSeconds = Math.max(0.1, Math.min(2, options.tailSeconds || 0.35));
  const duration = Math.max(0.25, timeline.totalDurationSeconds + tailSeconds);
  if (duration > 600) throw new Error('Bản nhạc quá dài để kết xuất WAV trên trình duyệt.');

  const OfflineCtor = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtor) throw new Error('Trình duyệt này không hỗ trợ kết xuất WAV offline.');

  const frameCount = Math.ceil(duration * sampleRate);
  const context: OfflineAudioContext = new OfflineCtor(channels, frameCount, sampleRate);
  const master = context.createGain();
  master.gain.value = 0.82;
  master.connect(context.destination);
  const partScale = 1 / Math.max(1, Math.sqrt(timeline.parts.length));

  for (const part of timeline.parts) {
    for (const note of part.events) {
      const start = quarterToSeconds(note.startQuarter, timeline.tempoMap);
      const end = quarterToSeconds(note.startQuarter + note.durationQuarter, timeline.tempoMap);
      scheduleSynthNote(
        context,
        master,
        note,
        part,
        start,
        Math.max(0.03, end - start),
        partScale,
      );
    }
  }

  const audioBuffer = await context.startRendering();
  return audioBufferToWavBlob(audioBuffer);
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame] || 0));
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(pcm), true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
