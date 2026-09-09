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

const cMajorXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <work><work-title>Test Song</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
    <score-part id="P2"><part-name>Vocal</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony><root><root-step>G</root-step></root><kind text="dominant">dominant</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="120"/></direction>
      <direction><direction-type><words>Chorus</words></direction-type></direction>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><lyric><text>He</text><syllabic>begin</syllabic></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><lyric><text>llo</text><syllabic>end</syllabic></lyric></note>
    </measure>
  </part>
</score-partwise>`;

const aMinorXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Vocal</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <key><fifths>0</fifths><mode>minor</mode></key>
      </attributes>
    </measure>
  </part>
</score-partwise>`;

// 1. C major and A minor + Part Selection
const dnaC = extractSongDNA(cMajorXML);
assert(dnaC.musical.key === 'C', 'Key should be C major');
assert(dnaC.selectedMelodyPartId === 'P2', 'Should select P2 because it has lyrics');

const dnaA = extractSongDNA(aMinorXML);
assert(dnaA.musical.key === 'A', 'Key should be A minor for fifths=0 mode=minor');

// 2. Timing, Contours, Rhythm, Intervals
assert(dnaC.melody.length === 2, 'Should only extract 2 notes from P2');
assert(dnaC.fingerprint.contour[0] === 'UP', 'C to D is UP');
assert(dnaC.fingerprint.intervals[0] === 2, 'C4 to D4 is 2 semitones');
assert(dnaC.fingerprint.approximateRhythmicPattern[0] === 1, 'Duration 4 / 4 divisions = 1 quarter');
assert(dnaC.musical.tempoBpm === 120, 'Tempo should be 120');

// chord timing check (P1 has a chord note)
// re-parse with P1 to test chord timing
const dnaC_P1 = extractSongDNA(cMajorXML.replace('<lyric>', '').replace('</lyric>', '')); 
// wait, extracting explicitly without lyrics might select P1. P1 has 'Piano', P2 has 'Vocal'. 
// It will select P2 still because of 'Vocal' name. Let's make an explicit XML for chord check.

const chordXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Vocal</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;
const dnaChord = extractSongDNA(chordXML);
assert(dnaChord.melody[0].beatPosition === 0, 'First note beat=0');
assert(dnaChord.melody[1].beatPosition === 0, 'Chord note beat=0');
assert(dnaChord.melody[2].beatPosition === 1, 'Next note beat=1');

// 3. Optional Lyrics
const blueprintC = buildProductionBlueprint(dnaC, { lyrics: '[Chorus]\nHello there' });
assert(blueprintC.lyrics.exactLyrics === '[Chorus]\nHello there', 'Should override lyrics');
assert(blueprintC.melodyIdentity.chorusHook === 'C4 D4', 'Chorus hook should be extracted');
assert(blueprintC.harmony[0].progression.includes('G7'), 'G dominant should normalize to G7');

// 4. Gemini Brief content
const brief = buildGeminiMusicBrief(blueprintC);
assert(brief.includes('120'), 'Brief contains BPM');
assert(brief.includes('C major'), 'Brief contains key');
assert(brief.includes('Chorus Hook: C4 D4'), 'Brief contains chorus hook');
assert(brief.includes('[Chorus]\nHello there'), 'Brief contains exact sectioned lyrics');

// 5. Invalid XML
try {
  extractSongDNA("<<<<invalid");
  assert(false, 'Should throw');
} catch (e: any) {
  assert(e.code === 'INVALID_XML', 'Should return INVALID_XML');
}

// 6. Missing Score
try {
  extractSongDNA("<invalid></invalid>");
  assert(false, 'Should throw');
} catch (e: any) {
  assert(e.code === 'MISSING_SCORE', 'Should return MISSING_SCORE');
}

console.log("✅ ALL TARGETED TESTS PASSED!");
