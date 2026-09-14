import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { extractSongDNA } from './song-dna';

export interface MusicXMLValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateMusicXML(xml: string): MusicXMLValidationResult {
  const errors: string[] = [];
  
  // 1. Well-formed check
  const parseResult = XMLValidator.validate(xml);
  if (parseResult !== true) {
    errors.push(`XML not well-formed: ${parseResult.err?.msg || 'Unknown error'}`);
    return { isValid: false, errors };
  }

  // 2. Structural check
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const jsonObj = parser.parse(xml);
  
  const score = jsonObj['score-partwise'];
  if (!score) {
    errors.push("Missing <score-partwise> root element");
  } else {
    if (!score['part-list']) errors.push("Missing <part-list>");
    if (!score['part']) {
      errors.push("Missing <part>");
    } else {
      const parts = Array.isArray(score['part']) ? score['part'] : [score['part']];
      let hasMeasure = false;
      let hasPitchedNote = false;
      
      for (const part of parts) {
        if (!part) continue;
        const measures = Array.isArray(part['measure']) ? part['measure'] : [part['measure']];
        if (measures.length > 0) hasMeasure = true;
        
        for (const m of measures) {
          if (m['note']) {
            const notes = Array.isArray(m['note']) ? m['note'] : [m['note']];
            for (const n of notes) {
              if (n.pitch && n.pitch.step && n.pitch.octave !== undefined) {
                hasPitchedNote = true;
                break;
              }
            }
          }
          if (hasPitchedNote) break;
        }
        if (hasPitchedNote) break;
      }
      
      if (!hasMeasure) errors.push("Missing <measure> elements");
      if (!hasPitchedNote) errors.push("Score contains no pitched notes (rest-only scores are not allowed)");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateLeadSheet(xml: string, songRequest?: any): MusicXMLValidationResult {
  const baseResult = validateMusicXML(xml);
  if (!baseResult.isValid) return baseResult;

  const errors = [...baseResult.errors];
  
  const dna = extractSongDNA(xml);

  // 1. Vocal check
  const isVocal = !!(songRequest?.vocalDirection || songRequest?.language || (songRequest?.lyricDirection && songRequest.lyricDirection !== "None"));
  if (isVocal && (!dna.lyrics || dna.lyrics.syllables.length === 0)) {
    errors.push("Lead sheet missing lyrics for a vocal song");
  }

  // 2. Harmony check
  const needsHarmony = !!(songRequest?.harmonyDirection && songRequest.harmonyDirection !== "None");
  if (needsHarmony && (!dna.harmony || dna.harmony.length === 0)) {
    errors.push("Lead sheet missing <harmony> (chords) required by song request");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function computeLCS(seq1: number[], seq2: number[]): number {
  if (seq1.length === 0 || seq2.length === 0) return 0;
  const m = seq1.length;
  const n = seq2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seq1[i - 1] === seq2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function validateArrangement(xml: string, referenceLeadSheetXml?: string): MusicXMLValidationResult {
  const baseResult = validateMusicXML(xml);
  if (!baseResult.isValid) return baseResult;

  const errors = [...baseResult.errors];
  
  const arrangedDna = extractSongDNA(xml);
  
  if (referenceLeadSheetXml) {
    const refDna = extractSongDNA(referenceLeadSheetXml);
    
    // 1. Normalized main lyrics check
    const refLyric = (refDna.lyrics.assembledLyric || "").trim();
    const arrLyric = (arrangedDna.lyrics.assembledLyric || "").trim();
    if (refLyric.length > 0 && arrLyric.length === 0) {
      errors.push("Arrangement lost all lyrics from the original lead sheet");
    } else if (refLyric.length > 0) {
      const refNorm = refLyric.toLowerCase().replace(/[^a-z0-9à-ỹ]/g, "");
      const arrNorm = arrLyric.toLowerCase().replace(/[^a-z0-9à-ỹ]/g, "");
      if (refNorm.length > 0) {
        const lcsLen = computeLCS(refNorm.split('').map(c => c.charCodeAt(0)), arrNorm.split('').map(c => c.charCodeAt(0)));
        const ratio = lcsLen / refNorm.length;
        if (ratio < 0.4) {
          errors.push("Arrangement lost too many lyrics from the original lead sheet");
        }
      }
    }

    // 2. Musical constants (Key + Mode)
    const refKey = `${refDna.musical.key || ''} ${refDna.musical.mode || ''}`.trim();
    const arrKey = `${arrangedDna.musical.key || ''} ${arrangedDna.musical.mode || ''}`.trim();
    if (refKey && arrKey && refKey !== arrKey) {
      errors.push(`Arrangement changed key/mode from ${refKey} to ${arrKey}`);
    }

    // 3. Meter (Time Signature)
    if (refDna.musical.timeSignature && arrangedDna.musical.timeSignature) {
      if (refDna.musical.timeSignature !== arrangedDna.musical.timeSignature) {
        errors.push(`Arrangement changed time signature from ${refDna.musical.timeSignature} to ${arrangedDna.musical.timeSignature}`);
      }
    }

    // 4. Initial BPM
    if (refDna.musical.tempoBpm && arrangedDna.musical.tempoBpm) {
      if (Math.abs(refDna.musical.tempoBpm - arrangedDna.musical.tempoBpm) > 10) {
        errors.push(`Arrangement significantly changed initial BPM from ${refDna.musical.tempoBpm} to ${arrangedDna.musical.tempoBpm}`);
      }
    }

    // 5. Main Melodic Identity (Order-aware LCS similarity over MIDI sequence)
    const refMidi = refDna.fingerprint?.midiSequence || refDna.melody?.map(m => m.midi) || [];
    const arrMidi = arrangedDna.fingerprint?.midiSequence || arrangedDna.melody?.map(m => m.midi) || [];
    if (refMidi.length > 0) {
      const lcs = computeLCS(refMidi, arrMidi);
      const melodyRatio = lcs / refMidi.length;
      if (melodyRatio < 0.3) {
        errors.push("Arrangement failed to preserve the main melodic identity (order-aware sequence similarity too low)");
      }
    }

    // 6. Harmony check
    const refHarmonyCount = (refDna.harmony || []).reduce((acc, h) => acc + h.chordSymbols.length, 0);
    const arrHarmonyCount = (arrangedDna.harmony || []).reduce((acc, h) => acc + h.chordSymbols.length, 0);
    if (refHarmonyCount > 0 && arrHarmonyCount === 0) {
      errors.push("Arrangement lost harmony/chords present in the lead sheet");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
