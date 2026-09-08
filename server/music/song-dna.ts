import { XMLParser } from 'fast-xml-parser';
import { Note } from '@tonaljs/tonal';
import { SongDNA, MelodyFingerprint } from './types';

function toArray(obj: any): any[] {
  if (obj === undefined || obj === null) return [];
  return Array.isArray(obj) ? obj : [obj];
}

export function extractSongDNA(musicXml: string, sourceRunId?: string): SongDNA {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const parsed = parser.parse(musicXml);
  const score = parsed['score-partwise'];
  
  if (!score) {
    throw new Error('Invalid MusicXML: Missing score-partwise');
  }

  const identity = {
    title: score?.work?.['work-title'] || score?.movement?.['movement-title'] || undefined,
    sourceRunId
  };

  const instrumentation: any[] = [];
  const partList = toArray(score['part-list']?.['score-part']);
  for (const part of partList) {
    instrumentation.push({
      partId: part['@_id'],
      partName: part['part-name'],
      midiProgram: part['midi-instrument']?.['midi-program'] ? parseInt(part['midi-instrument']['midi-program']) : undefined
    });
  }

  let tempoBpm: number | undefined;
  let divisions = 1;
  let timeSignature: string | undefined;
  let keyFifths = 0;
  let keyMode: string | undefined;

  const melody: SongDNA['melody'] = [];
  const lyricsSyllables: string[] = [];
  let assembledLyric = '';

  const parts = toArray(score.part);
  let highestMidi = -1;
  let lowestMidi = 999;
  
  const harmony: SongDNA['harmony'] = [];

  for (const part of parts) {
    const measures = toArray(part.measure);
    let currentMeasure = 0;
    
    for (const measure of measures) {
      currentMeasure = parseInt(measure['@_number']) || currentMeasure + 1;
      let beatPosition = 0;

      const attributesList = toArray(measure.attributes);
      for (const attr of attributesList) {
        if (attr.divisions) divisions = parseInt(attr.divisions);
        if (attr.time) {
          timeSignature = `${attr.time.beats}/${attr.time['beat-type']}`;
        }
        if (attr.key) {
          keyFifths = parseInt(attr.key.fifths || '0');
          keyMode = attr.key.mode;
        }
      }

      const directions = toArray(measure.direction);
      for (const dir of directions) {
        const sound = dir.sound;
        if (sound && sound['@_tempo']) {
          if (!tempoBpm) tempoBpm = parseInt(sound['@_tempo']);
        }
      }

      const harmonies = toArray(measure.harmony);
      if (harmonies.length > 0) {
        const chordSymbols = harmonies.map(h => {
          const root = h.root?.['root-step'] || '';
          const kind = typeof h.kind === 'object' ? h.kind['#text'] : (h.kind || '');
          return `${root}${kind}`;
        });
        harmony.push({ measure: currentMeasure, chordSymbols });
      }

      const notes = toArray(measure.note);
      for (const note of notes) {
        if (note.pitch) {
          const step = note.pitch.step;
          let alter = note.pitch.alter ? parseInt(note.pitch.alter) : 0;
          let acc = '';
          if (alter === 1) acc = '#';
          if (alter === -1) acc = 'b';
          const oct = note.pitch.octave;
          const pitchString = `${step}${acc}${oct}`;
          
          const midi = Note.midi(pitchString);
          const dur = parseInt(note.duration || '0');
          
          if (midi !== null) {
            melody.push({
              pitch: pitchString,
              octave: parseInt(oct),
              midi,
              duration: dur,
              beatPosition,
              measure: currentMeasure
            });
            if (midi > highestMidi) highestMidi = midi;
            if (midi < lowestMidi) lowestMidi = midi;
          }
          beatPosition += dur;
        } else {
          // rest
          const dur = parseInt(note.duration || '0');
          beatPosition += dur;
        }

        const lyric = note.lyric;
        if (lyric) {
          const text = lyric.text;
          const syll = lyric.syllabic;
          if (text) {
            lyricsSyllables.push(text);
            if (syll === 'begin' || syll === 'middle') {
              assembledLyric += text;
            } else {
              assembledLyric += text + ' ';
            }
          }
        }
      }
    }
  }

  const keysSharp = ['C','G','D','A','E','B','F#','C#'];
  const keysFlat = ['C','F','Bb','Eb','Ab','Db','Gb','Cb'];
  let key = 'C';
  if (keyFifths > 0 && keyFifths < keysSharp.length) key = keysSharp[keyFifths];
  if (keyFifths < 0 && Math.abs(keyFifths) < keysFlat.length) key = keysFlat[Math.abs(keyFifths)];

  const vocal = {
    lowestNote: lowestMidi !== 999 ? Note.fromMidi(lowestMidi) : undefined,
    highestNote: highestMidi !== -1 ? Note.fromMidi(highestMidi) : undefined,
  };

  const pitchSequence = melody.map(m => m.pitch);
  const midiSequence = melody.map(m => m.midi);
  const intervals: number[] = [];
  const contour: ("UP"|"DOWN"|"SAME")[] = [];
  
  for (let i = 1; i < midiSequence.length; i++) {
    const diff = midiSequence[i] - midiSequence[i-1];
    intervals.push(diff);
    if (diff > 0) contour.push("UP");
    else if (diff < 0) contour.push("DOWN");
    else contour.push("SAME");
  }

  const openingMotif = pitchSequence.slice(0, 5);
  const cadenceNotes = pitchSequence.slice(-3);

  const fingerprint: MelodyFingerprint = {
    openingMotif,
    pitchSequence,
    midiSequence,
    intervals,
    contour,
    cadenceNotes,
    highestNote: vocal.highestNote,
    lowestNote: vocal.lowestNote,
    approximateRhythmicPattern: 'Derived from durations'
  };

  return {
    identity,
    musical: {
      key,
      mode: keyMode,
      tempoBpm,
      timeSignature,
      divisions
    },
    vocal,
    structure: [], // Basic structure, can be expanded based on repeats/double barlines later
    harmony,
    melody,
    lyrics: {
      syllables: lyricsSyllables,
      assembledLyric: assembledLyric.trim()
    },
    instrumentation,
    fingerprint
  };
}
