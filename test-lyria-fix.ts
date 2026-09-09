import { buildProductionBlueprint } from './server/music/production-blueprint';
import { extractSongDNA } from './server/music/song-dna';
import { buildLyriaPrompt, buildGeminiMusicBrief } from './server/music/gemini-music-brief';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error("❌ ASSERTION FAILED:", message);
        process.exit(1);
    }
}

console.log("--- Running Targeted Checks ---");

const completeXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><sound tempo="120"/></direction>
      <attributes>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><lyric><text>Hello</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><lyric><text>world</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

const dna = extractSongDNA(completeXML);

// Test B: without lyrics explicitly provided, it extracts from XML
const bpWithoutLyrics = buildProductionBlueprint(dna, { idea: "Happy song" });
assert(bpWithoutLyrics.lyrics.exactLyrics === 'Hello world', 'B. Blueprint should extract lyrics from XML if not provided');

// Test C: Lyria prompt contains all the things
const prompt = buildLyriaPrompt(bpWithoutLyrics);
assert(prompt.includes('BPM: 120'), 'C. Should include BPM');
assert(prompt.includes('Key: C major'), 'C. Should include key');
assert(prompt.includes('Meter: 4/4'), 'C. Should include meter');
assert(prompt.includes('Hello world'), 'C. Should include exact lyrics');
assert(prompt.includes('Structure:'), 'C. Should include structure');
assert(prompt.includes('Harmonic progression:'), 'C. Should include harmony');
assert(prompt.includes('Opening melodic motif:'), 'C. Should include opening motif');
// Chorus hook won't be in this small example, but we checked the string concatenation earlier
assert(prompt.includes('Rhythmic fingerprint:'), 'C. Should include rhythmic fingerprint');
assert(prompt.includes('Melodic contour:'), 'C. Should include contour');
assert(prompt.includes('Phrase cadence:'), 'C. Should include cadence');

// Test D: Partial timing => no target duration
const partialXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;
const dnaPartial = extractSongDNA(partialXML);
const bpPartial = buildProductionBlueprint(dnaPartial);
const promptPartial = buildLyriaPrompt(bpPartial);
assert(!promptPartial.includes('Target duration:'), 'D. Prompt should not contain target duration for partial timing');

// Test E: Gemini brief wording
const brief = buildGeminiMusicBrief(bpWithoutLyrics);
assert(!brief.includes('bản master MusicXML đã cung cấp'), 'E. Gemini brief should not imply XML is sent');
assert(brief.includes('được trích xuất từ bản master MusicXML'), 'E. Gemini brief should be self-contained wording');

console.log("✅ ALL TARGETED TESTS PASSED");
