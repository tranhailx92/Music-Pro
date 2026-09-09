import { SongDNA, ProductionBlueprint } from './types';

export function buildProductionBlueprint(
  dna: SongDNA,
  options?: { genre?: string; mood?: string; style?: string; language?: string; lyrics?: string; arrangementNotes?: string; idea?: string }
): ProductionBlueprint {
  
  const harmonyBySection: Array<{section: string; progression: string[]}> = [];
  const getSectionForMeasure = (m: number) => {
    const sec = dna.structure.find(s => m >= s.measureStart && m <= s.measureEnd);
    return sec ? sec.sectionName : 'Toàn bài';
  };
  
  const progressionMap = new Map<string, string[]>();
  for (const h of dna.harmony) {
     const secName = getSectionForMeasure(h.measure);
     if (!progressionMap.has(secName)) progressionMap.set(secName, []);
     progressionMap.get(secName)!.push(...h.chordSymbols);
  }
  for (const [section, progression] of progressionMap.entries()) {
     harmonyBySection.push({ section, progression });
  }

  const structure = dna.structure.length > 0 
    ? dna.structure.map(s => ({ name: s.sectionName, start: s.measureStart, end: s.measureEnd })) 
    : [{ name: 'Toàn bài', start: 1, end: dna.melody.length ? dna.melody[dna.melody.length - 1].measure : 1 }];

  let chorusMotif: string | undefined;
  const chorusSection = structure.find(s => s.name.toLowerCase().includes('chorus'));
  if (chorusSection) {
     const chorusNotes = dna.melody.filter(m => m.measure >= chorusSection.start && m.measure <= chorusSection.end);
     if (chorusNotes.length > 0) {
        chorusMotif = chorusNotes.slice(0, 5).map(n => n.pitch).join(' ');
     }
  }

  return {
    identity: {
      title: dna.identity.title || 'Bản nhạc không tên',
      language: options?.language || 'vi',
      genre: options?.genre || options?.style || 'Pop',
      mood: options?.mood || 'Tự nhiên'
    },
    musical: {
      key: dna.musical.key,
      mode: dna.musical.mode,
      tempo: dna.musical.tempoBpm,
      meter: dna.musical.timeSignature,
      vocalRange: dna.vocal.lowestNote && dna.vocal.highestNote 
        ? `${dna.vocal.lowestNote} - ${dna.vocal.highestNote}`
        : undefined,
      targetDuration: dna.musical.approximateDuration
    },
    structure,
    harmony: harmonyBySection.length > 0 ? harmonyBySection : [{ section: 'Toàn bài', progression: [] }],
    melodyIdentity: {
      mainMotif: dna.fingerprint.openingMotif.join(' '),
      chorusHook: chorusMotif,
      cadences: dna.fingerprint.cadenceNotes.join(' '),
      contour: dna.fingerprint.contour.slice(0, 10).join(' '),
      constraints: 'Ưu tiên giữ nhận diện giai điệu, đặc biệt motif/hook đã cung cấp.',
      normalizedRhythm: dna.fingerprint.approximateRhythmicPattern.slice(0, 10)
    },
    arrangement: {
      instruments: dna.instrumentation.map(i => i.partName || 'Unknown'),
      roles: {},
      productionDirection: options?.arrangementNotes
    },
    lyrics: {
      exactLyrics: options?.lyrics || dna.lyrics.assembledLyric,
      sections: []
    },
    fidelity: 'high'
  };
}
