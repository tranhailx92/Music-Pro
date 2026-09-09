import { XMLParser, XMLValidator } from 'fast-xml-parser';

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
  const parser = new XMLParser();
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
      let hasNote = false;
      
      for (const part of parts) {
        if (!part) continue;
        if (part['measure']) {
          hasMeasure = true;
          const measures = Array.isArray(part['measure']) ? part['measure'] : [part['measure']];
          for (const m of measures) {
            if (m['note']) {
              hasNote = true;
              break;
            }
          }
        }
        if (hasNote) break;
      }
      
      if (!hasMeasure) errors.push("Missing <measure> elements");
      if (!hasNote) errors.push("Missing <note> elements");
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
  const parser = new XMLParser();
  const jsonObj = parser.parse(xml);
  const score = jsonObj['score-partwise'];

  // Vocal check
  if (songRequest?.vocalDirection || songRequest?.language) {
    let hasLyrics = false;
    const parts = Array.isArray(score['part']) ? score['part'] : [score['part']];
    for (const part of parts) {
      const measures = Array.isArray(part['measure']) ? part['measure'] : [part['measure']];
      for (const m of measures) {
        if (m['note']) {
          const notes = Array.isArray(m['note']) ? m['note'] : [m['note']];
          if (notes.some(n => n.lyric)) {
            hasLyrics = true;
            break;
          }
        }
      }
      if (hasLyrics) break;
    }
    if (!hasLyrics) errors.push("Lead sheet missing lyrics for a vocal song");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateArrangement(xml: string, referenceLeadSheetXml?: string): MusicXMLValidationResult {
  const baseResult = validateMusicXML(xml);
  if (!baseResult.isValid) return baseResult;

  // Basic sanity check: arrangement should usually have at least as many parts as lead sheet
  // But we won't be too strict here yet.
  
  return baseResult;
}
