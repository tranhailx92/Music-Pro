import { validateMusicXML, validateLeadSheet, validateArrangement } from "../../server/music/musicxml-validator";

console.log("--- Testing MusicXML Validation Logic ---");

const validXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

if (!validateMusicXML(validXML).isValid) {
    throw new Error("Valid XML failed validation");
}
console.log("✅ Valid XML passed");

const invalidXML1 = "<score-partwise>missing close tag";
if (validateMusicXML(invalidXML1).isValid) {
    throw new Error("Invalid XML (missing close) passed validation");
}
console.log("✅ Invalid XML (missing close) caught");

const invalidXML2 = "<score-partwise><part-list></part-list></score-partwise>"; // missing part/measure
if (validateMusicXML(invalidXML2).isValid) {
    throw new Error("Invalid XML (missing structure) passed validation");
}
console.log("✅ Invalid XML (missing structure) caught");

// Test Lead Sheet lyrics check
const leadSheetNoLyrics = validXML;
const vocalRequest = { vocalDirection: "Male Singer" };
if (validateLeadSheet(leadSheetNoLyrics, vocalRequest).isValid) {
    throw new Error("Lead sheet without lyrics passed for vocal song");
}
console.log("✅ Lead sheet lyrics check caught missing lyrics");

// --- Real validateArrangement Regression Tests ---
const refLeadSheet = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="120"/>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>La</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>lu</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
    </measure>
  </part>
</score-partwise>`;

// 1. Same melody + added orchestration => PASS
const arrangedValid = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Melody</part-name></score-part>
    <score-part id="P2"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="120"/>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>La</text></lyric></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>lu</text></lyric></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

if (!validateArrangement(arrangedValid, refLeadSheet).isValid) {
  throw new Error("Arrangement test 1 (same melody + orchestration) failed");
}
console.log("✅ Arrangement test 1 (same melody + orchestration) passed");

// 2. Completely different melody with same note count => FAIL
const arrangedDifferentMelody = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Melody</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <sound tempo="120"/>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>La</text></lyric></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>lu</text></lyric></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><lyric><text>la</text></lyric></note>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
    </measure>
  </part>
</score-partwise>`;

if (validateArrangement(arrangedDifferentMelody, refLeadSheet).isValid) {
  throw new Error("Arrangement test 2 (different melody) incorrectly passed");
}
console.log("✅ Arrangement test 2 (different melody) caught");

// 3. Changed key/mode => FAIL
const arrangedChangedKey = arrangedValid.replace('<fifths>0</fifths>', '<fifths>2</fifths>');
if (validateArrangement(arrangedChangedKey, refLeadSheet).isValid) {
  throw new Error("Arrangement test 3 (changed key) incorrectly passed");
}
console.log("✅ Arrangement test 3 (changed key) caught");

// 4. Changed meter => FAIL
const arrangedChangedMeter = arrangedValid.replace('<beats>4</beats><beat-type>4</beat-type>', '<beats>3</beats><beat-type>4</beat-type>');
if (validateArrangement(arrangedChangedMeter, refLeadSheet).isValid) {
  throw new Error("Arrangement test 4 (changed meter) incorrectly passed");
}
console.log("✅ Arrangement test 4 (changed meter) caught");

// 5. Changed initial BPM => FAIL
const arrangedChangedBpm = arrangedValid.replace('tempo="120"', 'tempo="160"');
if (validateArrangement(arrangedChangedBpm, refLeadSheet).isValid) {
  throw new Error("Arrangement test 5 (changed BPM) incorrectly passed");
}
console.log("✅ Arrangement test 5 (changed BPM) caught");

// 6. Removed main lyrics => FAIL
const arrangedNoLyrics = arrangedValid.replace(/<lyric>.*?<\/lyric>/g, '');
if (validateArrangement(arrangedNoLyrics, refLeadSheet).isValid) {
  throw new Error("Arrangement test 6 (removed lyrics) incorrectly passed");
}
console.log("✅ Arrangement test 6 (removed lyrics) caught");

// 7. Lost harmony => FAIL
const arrangedNoHarmony = arrangedValid.replace(/<harmony>.*?<\/harmony>/g, '');
if (validateArrangement(arrangedNoHarmony, refLeadSheet).isValid) {
  throw new Error("Arrangement test 7 (lost harmony) incorrectly passed");
}
console.log("✅ Arrangement test 7 (lost harmony) caught");

console.log("🚀 ALL MUSICXML VALIDATION TESTS PASSED");
