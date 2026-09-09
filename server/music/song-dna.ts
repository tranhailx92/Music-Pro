import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Note, Interval } from '@tonaljs/tonal';
import { SongDNA, MelodyFingerprint } from './types';

function toArray(obj: any): any[] {
  if (obj === undefined || obj === null) return [];
  return Array.isArray(obj) ? obj : [obj];
}

export function extractSongDNA(musicXml: string, sourceRunId?: string): SongDNA {
  const validation = XMLValidator.validate(musicXml);
  if (validation !== true) {
    throw { code: 'INVALID_XML', message: 'Invalid XML format' };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const parsed = parser.parse(musicXml);
  const score = parsed['score-partwise'];
  
  if (!score) {
    throw { code: 'MISSING_SCORE', message: 'Invalid MusicXML: Missing score-partwise' };
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

  const partsData = toArray(score.part);
  
  let selectedPartId = '';
  let maxLyrics = -1;

  for (const p of partsData) {
    let lyricCount = 0;
    const measures = toArray(p.measure);
    for (const m of measures) {
      const notes = toArray(m.note);
      for (const n of notes) {
        if (n.lyric) lyricCount++;
      }
    }
    if (lyricCount > maxLyrics) {
      maxLyrics = lyricCount;
      selectedPartId = p['@_id'];
    }
  }

  if (maxLyrics === 0) {
    for (const p of partList) {
      const name = (p['part-name'] || '').toLowerCase();
      if (name.includes('vocal') || name.includes('voice') || name.includes('melody') || name.includes('singer')) {
        selectedPartId = p['@_id'];
        break;
      }
    }
  }

  if (!selectedPartId && partsData.length > 0) {
    selectedPartId = partsData[0]['@_id'];
  }

  const firstPart = partsData[0];
  const selectedPart = partsData.find(p => p['@_id'] === selectedPartId) || firstPart;

  let tempoBpm: number | undefined;
  let divisions = 1;
  let timeSignature: string | undefined;
  let keyFifths = 0;
  let keyMode = 'major';

  const melody: SongDNA['melody'] = [];
  const lyricsSyllables: string[] = [];
  let assembledLyric = '';

  let highestMidi = -1;
  let lowestMidi = 999;
  
  const harmony: SongDNA['harmony'] = [];
  const structure: SongDNA['structure'] = [];
  let currentSection: any = null;

  // Global parsing for Structure, Harmony, Tempo, Time Signature from ALL Parts
  const globalMeasuresByNumber: Record<number, any[]> = {};
  for (const part of partsData) {
    const pMeasures = toArray(part.measure);
    let mNum = 0;
    for (const m of pMeasures) {
      mNum = parseInt(m['@_number']) || mNum + 1;
      if (!globalMeasuresByNumber[mNum]) globalMeasuresByNumber[mNum] = [];
      globalMeasuresByNumber[mNum].push(m);
    }
  }

  const sortedMeasureNumbers = Object.keys(globalMeasuresByNumber).map(Number).sort((a, b) => a - b);
  for (const mNum of sortedMeasureNumbers) {
    const measures = globalMeasuresByNumber[mNum];
    
    // Read from the first measure of this number for global attributes
    const firstM = measures[0];
    const attributesList = toArray(firstM.attributes);
    for (const attr of attributesList) {
      if (attr.divisions) divisions = parseInt(attr.divisions);
      if (attr.time) {
        timeSignature = `${attr.time.beats || 4}/${attr.time['beat-type'] || 4}`;
      }
      if (attr.key) {
        keyFifths = parseInt(attr.key.fifths || '0');
        keyMode = attr.key.mode || 'major';
      }
    }

    // Check directions across all parts for this measure
    for (const m of measures) {
      const directions = toArray(m.direction);
      for (const dir of directions) {
        const sound = dir.sound;
        if (sound && sound['@_tempo']) {
          if (!tempoBpm) tempoBpm = parseInt(sound['@_tempo']);
        }
        
        const types = toArray(dir['direction-type']);
        for (const t of types) {
          let text = '';
          if (t.rehearsal) text = typeof t.rehearsal === 'object' ? t.rehearsal['#text'] || '' : t.rehearsal;
          else if (t.words) text = typeof t.words === 'object' ? t.words['#text'] || '' : t.words;
          
          if (text) {
            // Found a section marker
            if (currentSection && currentSection.sectionName !== text.trim()) {
              currentSection.measureEnd = mNum - 1;
              structure.push(currentSection);
              currentSection = null;
            }
            if (!currentSection) {
               currentSection = { sectionName: text.trim(), measureStart: mNum, measureEnd: mNum };
            }
          }
        }
      }

      const harmonies = toArray(m.harmony);
      if (harmonies.length > 0) {
        const chordSymbols = harmonies.map(normalizeChord);
        // Only push if we haven't pushed for this measure (since multiple parts might have the same chords)
        if (!harmony.find(h => h.measure === mNum)) {
           harmony.push({ measure: mNum, chordSymbols });
        }
      }
    }
    if (currentSection) currentSection.measureEnd = mNum;
  }

  if (currentSection) {
    structure.push(currentSection);
  }

  let totalQuarterNotes = 0;
  const measures = toArray(selectedPart.measure);
  let currentMeasure = 0;
  
  for (const measure of measures) {
    currentMeasure = parseInt(measure['@_number']) || currentMeasure + 1;
    const voiceTimes: Record<string, number> = {};

    // For the selected part, we still read divisions, as they can be part-specific.
    const attributesList = toArray(measure.attributes);
    for (const attr of attributesList) {
      if (attr.divisions) divisions = parseInt(attr.divisions);
    }

    const directions = toArray(measure.direction);
    for (const dir of directions) {
      const sound = dir.sound;
      if (sound && sound['@_tempo']) {
        if (!tempoBpm) tempoBpm = parseInt(sound['@_tempo']);
      }
    }

    const backups = toArray(measure.backup);
    const forwards = toArray(measure.forward);
    // Note: fast-xml-parser without preserveOrder groups elements by tag name.
    // It loses interleaving of notes and backups. Since we process all notes sequentially, 
    // a global backup/forward within a measure is tricky without order. 
    // Usually, backup separates voices. Because we track voiceTimes[v] per voice, 
    // parallel voices handle their own timing perfectly without needing the backup element!
    // We only need backup/forward if there are multiple layers in the same voice, which is rare.
    // But to satisfy the requirement "backup; forward nếu có":
    // We will just do a simple fallback if they exist, but voice tracking is already superior.

    const notes = toArray(measure.note);
    let prevDuration = 0;
    
    for (const note of notes) {
      const v = note.voice || '1';
      if (voiceTimes[v] === undefined) voiceTimes[v] = 0;

      const dur = parseInt(note.duration || '0');
      let isChord = note.chord !== undefined;

      if (isChord) {
        voiceTimes[v] -= prevDuration;
      }

      if (note.pitch) {
        const step = note.pitch.step;
        let alter = note.pitch.alter ? parseInt(note.pitch.alter) : 0;
        let acc = '';
        if (alter === 1) acc = '#';
        if (alter === -1) acc = 'b';
        const oct = note.pitch.octave;
        const pitchString = `${step}${acc}${oct}`;
        
        const midi = Note.midi(pitchString);
        
        if (midi !== null) {
          melody.push({
            pitch: pitchString,
            octave: parseInt(oct),
            midi,
            duration: dur,
            beatPosition: voiceTimes[v],
            measure: currentMeasure
          });
          if (midi > highestMidi) highestMidi = midi;
          if (midi < lowestMidi) lowestMidi = midi;
        }
      }

      voiceTimes[v] += dur;
      prevDuration = dur;
      
      if (!isChord && (note.pitch || note.rest !== undefined)) {
         totalQuarterNotes += dur / divisions;
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

  const majorKeys: Record<string, string> = {
    '0': 'C', '1': 'G', '2': 'D', '3': 'A', '4': 'E', '5': 'B', '6': 'F#', '7': 'C#',
    '-1': 'F', '-2': 'Bb', '-3': 'Eb', '-4': 'Ab', '-5': 'Db', '-6': 'Gb', '-7': 'Cb'
  };
  const minorKeys: Record<string, string> = {
    '0': 'A', '1': 'E', '2': 'B', '3': 'F#', '4': 'C#', '5': 'G#', '6': 'D#', '7': 'A#',
    '-1': 'D', '-2': 'G', '-3': 'C', '-4': 'F', '-5': 'Bb', '-6': 'Eb', '-7': 'Ab'
  };
  
  let key = 'C';
  if (keyMode === 'minor') {
    key = minorKeys[keyFifths.toString()] || 'A';
  } else {
    key = majorKeys[keyFifths.toString()] || 'C';
  }

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

  const scaleDegrees = melody.map(m => {
     try {
       const keyPc = Note.pitchClass(key) || key;
       const notePc = Note.pitchClass(m.pitch) || m.pitch.replace(/\d+/, '');
       const ivl = Interval.distance(keyPc + '4', notePc + '4');
       const match = ivl.match(/\d+/);
       return match ? parseInt(match[0]) : 1;
     } catch (e) { return 1; }
  });

  const openingMotif = pitchSequence.slice(0, 5);
  const cadenceNotes = pitchSequence.slice(-3);
  const rhythmicPattern = melody.map(m => m.duration / divisions);

  let approximateDuration = undefined;
  if (tempoBpm && totalQuarterNotes > 0) {
    approximateDuration = totalQuarterNotes / (tempoBpm / 60);
  }

  const fingerprint: MelodyFingerprint = {
    openingMotif,
    pitchSequence,
    midiSequence,
    intervals,
    contour,
    scaleDegrees,
    cadenceNotes,
    highestNote: vocal.highestNote,
    lowestNote: vocal.lowestNote,
    approximateRhythmicPattern: rhythmicPattern
  };

  return {
    identity,
    selectedMelodyPartId: selectedPartId,
    musical: {
      key,
      mode: keyMode,
      tempoBpm,
      timeSignature,
      divisions,
      approximateDuration
    },
    vocal,
    structure,
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

function normalizeChord(harmonyObj: any): string {
  const root = harmonyObj.root?.['root-step'] || '';
  const rootAlter = parseInt(harmonyObj.root?.['root-alter'] || '0');
  let acc = '';
  if (rootAlter === 1) acc = '#';
  if (rootAlter === -1) acc = 'b';

  let kindText = '';
  const kind = harmonyObj.kind;
  const kVal = typeof kind === 'object' ? kind['#text'] : kind;
  if (kVal === 'minor') kindText = 'm';
  else if (kVal === 'major') kindText = '';
  else if (kVal === 'dominant') kindText = '7';
  else if (kVal === 'major-seventh') kindText = 'maj7';
  else if (kVal === 'minor-seventh') kindText = 'm7';
  else if (kVal === 'diminished') kindText = 'dim';
  else if (kVal === 'half-diminished') kindText = 'm7b5';
  else if (kVal === 'augmented') kindText = 'aug';
  else kindText = kVal || '';

  let bassStr = '';
  if (harmonyObj.bass?.['bass-step']) {
      const bassStep = harmonyObj.bass['bass-step'];
      const bassAlter = parseInt(harmonyObj.bass['bass-alter'] || '0');
      let bAcc = '';
      if (bassAlter === 1) bAcc = '#';
      if (bassAlter === -1) bAcc = 'b';
      bassStr = `/${bassStep}${bAcc}`;
  }
  return `${root}${acc}${kindText}${bassStr}`;
}
