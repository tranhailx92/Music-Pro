import { buildProductionBlueprint } from './server/music/production-blueprint';
import { extractSongDNA } from './server/music/song-dna';
import { buildLyriaPrompt } from './server/music/gemini-music-brief';

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error("❌ ASSERTION FAILED:", message);
        process.exit(1);
    }
}

console.log("--- Running Targeted Checks ---");

const backupXML = `<?xml version="1.0" encoding="UTF-8"?>
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

const dna = extractSongDNA(backupXML);
assert(dna.musical.timingConfidence === 'partial', 'timingConfidence should be partial');

const bp = buildProductionBlueprint(dna);
assert(bp.musical.targetDuration === undefined, 'targetDuration should be undefined');

const prompt = buildLyriaPrompt(bp);
assert(!prompt.includes('Target duration:'), 'Prompt should not contain target duration');

const completeXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><sound tempo="120"/></direction>
      <attributes><key><fifths>0</fifths><mode>major</mode></key></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><lyric><text>Hello</text></lyric></note>
    </measure>
  </part>
</score-partwise>`;

const dna2 = extractSongDNA(completeXML);
const bp2 = buildProductionBlueprint(dna2, { lyrics: "Hello world", idea: "Happy song" });
const prompt2 = buildLyriaPrompt(bp2);

assert(prompt2.includes('120 BPM'), 'Should include BPM');
assert(prompt2.includes('in C'), 'Should include key');
assert(prompt2.includes('Hello world'), 'Should include exact lyrics');

console.log("✅ LYRIA PROMPT TESTS PASSED");
