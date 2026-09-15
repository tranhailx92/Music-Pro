import { encodeVariableLength, timelineToMidiBytes } from '../../src/music/midi-export';
import type { ScoreTimeline } from '../../src/music/score-timeline';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

console.log('--- MIDI export tests ---');

assert(JSON.stringify(encodeVariableLength(0)) === JSON.stringify([0]), 'VLQ 0');
assert(JSON.stringify(encodeVariableLength(127)) === JSON.stringify([127]), 'VLQ 127');
assert(JSON.stringify(encodeVariableLength(128)) === JSON.stringify([0x81, 0x00]), 'VLQ 128');
console.log('✅ variable length encoding');

const timeline: ScoreTimeline = {
  title: 'Test',
  tempoMap: [{ quarter: 0, bpm: 120 }],
  timeSignatures: [{ quarter: 0, beats: 4, beatType: 4 }],
  measureStarts: [{ measure: 1, quarter: 0 }],
  totalQuarters: 4,
  totalDurationSeconds: 2,
  parts: [
    {
      partId: 'P1',
      name: 'Piano',
      midiProgram: 1,
      events: [
        {
          id: 'n1',
          partId: 'P1',
          midi: 60,
          startQuarter: 0,
          durationQuarter: 1,
          velocity: 90,
          measure: 1,
          voice: '1',
          staff: '1',
        },
      ],
    },
  ],
};

const bytes = timelineToMidiBytes(timeline);
const text = String.fromCharCode(...bytes.slice(0, 4));
assert(text === 'MThd', 'MIDI must start with MThd');
assert(bytes.length > 40, 'MIDI should contain conductor and part tracks');
const trackMarkers = Array.from(bytes).reduce((count, value, index, all) => {
  if (value === 0x4d && all[index + 1] === 0x54 && all[index + 2] === 0x72 && all[index + 3] === 0x6b) return count + 1;
  return count;
}, 0);
assert(trackMarkers === 2, 'Type-1 MIDI must contain conductor + one part track');
console.log('✅ Standard MIDI file structure');

const percussionTimeline: ScoreTimeline = {
  ...timeline,
  parts: [
    {
      partId: 'P10',
      name: 'Drum Kit',
      isPercussion: true,
      events: [
        {
          id: 'kick', partId: 'P10', midi: 36, startQuarter: 0, durationQuarter: 0.25,
          velocity: 100, measure: 1, voice: '1', staff: '1',
        },
      ],
    },
  ],
};
const percussionBytes = Array.from(timelineToMidiBytes(percussionTimeline));
assert(percussionBytes.some((value, index, all) => value === 0x99 && all[index + 1] === 36), 'percussion note-on must use MIDI channel 10');
console.log('✅ percussion channel mapping');

console.log('🚀 MIDI EXPORT TESTS PASSED');
