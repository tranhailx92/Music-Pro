import { validateMusicXML, validateLeadSheet } from "../../server/music/musicxml-validator";

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

console.log("🚀 ALL MUSICXML VALIDATION TESTS PASSED");
