import { extractSongDNA } from './server/music/song-dna';
import { buildProductionBlueprint } from './server/music/production-blueprint';
import { buildGeminiMusicBrief } from './server/music/gemini-music-brief';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error("❌ ASSERTION FAILED:", message);
        process.exit(1);
    }
}

console.log("--- Running Targeted Tests ---");

// A & B. POLYPHONIC DURATION & CHORD PER VOICE
const polyphonicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <direction><sound tempo="60"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
      <note><chord/><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice></note>
    </measure>
  </part>
</score-partwise>`;
const polyDNA = extractSongDNA(polyphonicXML);
// Measure duration should be max(voice1, voice2) = max(4, 4) = 4 quarters
// Since tempo is 60 (1 quarter / sec), total duration should be 4 seconds
assert(polyDNA.musical.approximateDuration === 4, 'Measure duration should be max of voices, not sum');

// C. TEMPO CHANGE
const tempoXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <direction><sound tempo="60"/></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
    <measure number="2">
      <direction><sound tempo="120"/></direction>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;
const tempoDNA = extractSongDNA(tempoXML);
assert(tempoDNA.musical.tempoChanges!.length === 2, 'Should have 2 tempo changes');
// Measure 1: 4 quarters @ 60 bpm = 4 seconds
// Measure 2: 4 quarters @ 120 bpm = 2 seconds
assert(tempoDNA.musical.approximateDuration === 6, 'Total duration should reflect tempo map');

// D & F. STRUCTURE FILTER & CHORUS MOTIF
const structureXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><direction-type><words>rit.</words></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="2">
      <direction><direction-type><words>Chorus</words></direction-type></direction>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;
const structDNA = extractSongDNA(structureXML);
assert(structDNA.structure.find(s => s.sectionName === 'rit.') === undefined, 'rit. is not a section');
assert(structDNA.structure.find(s => s.sectionName === 'Chorus') !== undefined, 'Chorus is a section');
assert(structDNA.fingerprint.chorusMotif !== undefined, 'Chorus motif should exist when Chorus section exists');

// E. SECTIONED LYRICS
const lyricsBp = buildProductionBlueprint(structDNA, { lyrics: "[Verse 1]\nHello\n[Chorus]\nWorld" });
assert(lyricsBp.lyrics.sections.length === 2, 'Should parse 2 lyric sections');
assert(lyricsBp.lyrics.sections[0].name === 'Verse 1', 'Section name is Verse 1');
assert(lyricsBp.lyrics.sections[1].text === 'World', 'Chorus text is World');

// G. score-timewise
try {
  extractSongDNA("<score-timewise></score-timewise>");
  assert(false, 'Should throw');
} catch (e: any) {
  assert(e.code === 'UNSUPPORTED_MUSICXML', 'Should return UNSUPPORTED_MUSICXML');
}

console.log("✅ ALL TARGETED TESTS PASSED!");
