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

export function validateArrangement(xml: string, referenceLeadSheetXml?: string): MusicXMLValidationResult {
  const baseResult = validateMusicXML(xml);
  if (!baseResult.isValid) return baseResult;

  const errors = [...baseResult.errors];
  
  const arrangedDna = extractSongDNA(xml);
  
  if (referenceLeadSheetXml) {
    const refDna = extractSongDNA(referenceLeadSheetXml);
    
    // 1. Lyrics master check
    if (refDna.lyrics.syllables.length > 0 && arrangedDna.lyrics.syllables.length < refDna.lyrics.syllables.length * 0.8) {
      errors.push("Arrangement lost too many lyrics from the original lead sheet");
    }

    // 2. Musical constants
    if (refDna.musical.timeSignature && arrangedDna.musical.timeSignature !== refDna.musical.timeSignature) {
      errors.push(`Arrangement changed time signature from ${refDna.musical.timeSignature} to ${arrangedDna.musical.timeSignature}`);
    }

    if (refDna.musical.key && arrangedDna.musical.key !== refDna.musical.key) {
      errors.push(`Arrangement changed key from ${refDna.musical.key} to ${arrangedDna.musical.key}`);
    }

    // 3. Melodic Identity (Simplified)
    // At least one part should have a significant overlap with the original pitch sequence
    // or the melody sequence should be preserved in some part.
    // For now, we check if the arranged score has enough pitched notes.
    if (arrangedDna.melody.length < refDna.melody.length * 0.5) {
      errors.push("Arrangement has significantly fewer notes than the lead sheet");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
