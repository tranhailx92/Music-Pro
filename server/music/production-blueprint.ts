import { SongDNA, ProductionBlueprint } from './types';

export function buildProductionBlueprint(
  dna: SongDNA,
  options?: { genre?: string; mood?: string; style?: string; language?: string }
): ProductionBlueprint {
  const progression = dna.harmony.map(h => h.chordSymbols.join(' ')).filter(Boolean);
  
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
    },
    structure: dna.structure.length > 0 
      ? dna.structure.map(s => ({ name: s.sectionName, start: s.measureStart, end: s.measureEnd })) 
      : [{ name: 'Toàn bài', start: 1, end: dna.melody.length ? dna.melody[dna.melody.length - 1].measure : 1 }],
    harmony: [{ section: 'Toàn bài', progression }],
    melodyIdentity: {
      mainMotif: dna.fingerprint.openingMotif.join(' '),
      cadences: dna.fingerprint.cadenceNotes.join(' '),
      contour: dna.fingerprint.contour.slice(0, 10).join(' '),
      constraints: 'Giữ nguyên tuyệt đối chuỗi cao độ và nhịp điệu của bản nhạc.'
    },
    arrangement: {
      instruments: dna.instrumentation.map(i => i.partName || 'Unknown'),
      roles: {},
      energyCurve: 'Tăng dần',
      productionDirection: 'High fidelity reproduction of original composition'
    },
    lyrics: {
      exactLyrics: dna.lyrics.assembledLyric,
      sections: []
    },
    fidelity: 'high'
  };
}
