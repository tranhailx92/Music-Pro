import type { ScorePartTimeline, ScoreTimeline } from './score-timeline';
import { resolveMidiProgram } from './instrument-program';

const DEFAULT_PPQ = 480;

interface MidiEvent {
  tick: number;
  priority: number;
  bytes: number[];
}

export function encodeVariableLength(value: number): number[] {
  let buffer = Math.max(0, Math.floor(value)) & 0x7f;
  const bytes: number[] = [];
  while ((value = Math.floor(value) >> 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function uint32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function uint16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function ascii(value: string): number[] {
  return Array.from(value).map(char => char.charCodeAt(0) & 0xff);
}

function utf8(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

function chunk(type: string, data: number[]): number[] {
  return [...ascii(type), ...uint32(data.length), ...data];
}

function trackNameEvent(name: string): number[] {
  const bytes = utf8(name);
  return [0xff, 0x03, ...encodeVariableLength(bytes.length), ...bytes];
}

function endOfTrack(): number[] {
  return [0xff, 0x2f, 0x00];
}

function bpmToTempoBytes(bpm: number): number[] {
  const microseconds = Math.max(1, Math.min(0xffffff, Math.round(60_000_000 / Math.max(1, bpm))));
  return [
    0xff,
    0x51,
    0x03,
    (microseconds >>> 16) & 0xff,
    (microseconds >>> 8) & 0xff,
    microseconds & 0xff,
  ];
}

function denominatorPower(beatType: number): number {
  const safe = Math.max(1, beatType);
  return Math.max(0, Math.min(7, Math.round(Math.log2(safe))));
}

function renderTrack(events: MidiEvent[]): number[] {
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.priority - b.priority);
  const data: number[] = [];
  let previousTick = 0;
  for (const event of sorted) {
    const tick = Math.max(previousTick, Math.round(event.tick));
    data.push(...encodeVariableLength(tick - previousTick), ...event.bytes);
    previousTick = tick;
  }
  data.push(0x00, ...endOfTrack());
  return chunk('MTrk', data);
}

function buildConductorTrack(timeline: ScoreTimeline, ppq: number): number[] {
  const events: MidiEvent[] = [
    { tick: 0, priority: 0, bytes: trackNameEvent('Music-Pro Conductor') },
  ];

  for (const tempo of timeline.tempoMap) {
    events.push({
      tick: Math.round(tempo.quarter * ppq),
      priority: 1,
      bytes: bpmToTempoBytes(tempo.bpm),
    });
  }

  for (const signature of timeline.timeSignatures) {
    events.push({
      tick: Math.round(signature.quarter * ppq),
      priority: 2,
      bytes: [
        0xff,
        0x58,
        0x04,
        Math.max(1, Math.min(255, Math.round(signature.beats))),
        denominatorPower(signature.beatType),
        24,
        8,
      ],
    });
  }

  return renderTrack(events);
}

function isPercussionPart(part: ScorePartTimeline): boolean {
  return part.isPercussion === true || /drum|percussion|kit|trống|bộ gõ/i.test(part.name);
}

function channelForPart(part: ScorePartTimeline, index: number): number {
  if (isPercussionPart(part)) return 9;
  const melodicChannels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
  return melodicChannels[index % melodicChannels.length];
}

function buildPartTrack(part: ScorePartTimeline, partIndex: number, ppq: number): number[] {
  const channel = channelForPart(part, partIndex);
  const events: MidiEvent[] = [
    { tick: 0, priority: 0, bytes: trackNameEvent(part.name || part.partId) },
  ];

  if (channel !== 9) {
    const program = Math.max(0, Math.min(127, resolveMidiProgram(part) - 1));
    events.push({ tick: 0, priority: 1, bytes: [0xc0 | channel, program] });
  }

  for (const note of part.events) {
    const startTick = Math.max(0, Math.round(note.startQuarter * ppq));
    const endTick = Math.max(startTick + 1, Math.round((note.startQuarter + note.durationQuarter) * ppq));
    const midi = Math.max(0, Math.min(127, Math.round(note.midi)));
    const velocity = Math.max(1, Math.min(127, Math.round(note.velocity || 84)));
    events.push({ tick: startTick, priority: 3, bytes: [0x90 | channel, midi, velocity] });
    events.push({ tick: endTick, priority: 2, bytes: [0x80 | channel, midi, 0] });
  }

  return renderTrack(events);
}

export function timelineToMidiBytes(timeline: ScoreTimeline, ppq = DEFAULT_PPQ): Uint8Array {
  const safePpq = Math.max(24, Math.min(0x7fff, Math.round(ppq)));
  const tracks: number[][] = [buildConductorTrack(timeline, safePpq)];
  timeline.parts.forEach((part, index) => tracks.push(buildPartTrack(part, index, safePpq)));

  const headerData = [
    ...uint16(1),
    ...uint16(tracks.length),
    ...uint16(safePpq),
  ];
  const bytes = [
    ...chunk('MThd', headerData),
    ...tracks.flat(),
  ];
  return new Uint8Array(bytes);
}

export function timelineToMidiBlob(timeline: ScoreTimeline, ppq = DEFAULT_PPQ): Blob {
  const bytes = timelineToMidiBytes(timeline, ppq);
  return new Blob([bytes], { type: 'audio/midi' });
}
