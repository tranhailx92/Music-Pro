import type { ScoreTimeline } from '../music/score-timeline';
import { timelineToMidiBytes } from '../music/midi-export';
import { loadSoundFontBuffer } from './soundfont-cache';

export interface SoundFontRenderOptions {
  sampleRate?: number;
  tailSeconds?: number;
  soundFontUrl?: string;
}

function exactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function nextTask(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Render a ScoreTimeline through General MIDI sampled instruments without using
 * a live WebAudio destination. The resulting WAV is later played by the native
 * HTMLAudioElement pipeline, preserving the iPad/embedded-preview fix.
 */
export async function renderTimelineWithSoundFont(
  timeline: ScoreTimeline,
  options: SoundFontRenderOptions = {},
): Promise<Blob> {
  const sampleRate = Math.max(24_000, Math.min(44_100, Math.round(options.sampleRate || 32_000)));
  const tailSeconds = Math.max(0.25, Math.min(3, options.tailSeconds ?? 1));
  if (timeline.totalDurationSeconds > 600) {
    throw new Error('Bản nhạc quá dài để kết xuất SoundFont trên trình duyệt.');
  }

  const [{
    audioToWav,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
  }, soundFontBuffer] = await Promise.all([
    import('spessasynth_core'),
    loadSoundFontBuffer(options.soundFontUrl),
  ]);

  const midiBytes = timelineToMidiBytes(timeline);
  const midi = BasicMIDI.fromArrayBuffer(exactArrayBuffer(midiBytes));
  const soundBank = SoundBankLoader.fromArrayBuffer(soundFontBuffer.slice(0));

  const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false });
  synth.soundBankManager.addSoundBank(soundBank, 'music-pro-main');
  await synth.processorInitialized;
  synth.setSystemParameter('autoAllocateVoices', true);

  const sequencer = new SpessaSynthSequencer(synth);
  sequencer.loadNewSongList([midi]);
  sequencer.play();

  const duration = Math.max(0.25, midi.duration + tailSeconds);
  const sampleCount = Math.ceil(sampleRate * duration);
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  const blockSize = 128;
  let offset = 0;
  let blocks = 0;

  while (offset < sampleCount) {
    sequencer.processTick();
    const size = Math.min(blockSize, sampleCount - offset);
    synth.process(left, right, offset, size);
    offset += size;
    blocks += 1;

    // Keep long 3–4 minute renders from monopolizing the browser main thread.
    if (blocks % 4096 === 0) await nextTask();
  }

  const wav = audioToWav([left, right], sampleRate);
  return new Blob([wav], { type: 'audio/wav' });
}
