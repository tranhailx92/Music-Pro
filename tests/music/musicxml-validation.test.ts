// This test validates the logic used in composer.ts for MusicXML extraction and validation
import { XMLValidator } from 'fast-xml-parser';

function validateMusicXML(xml: string) {
    const isValidStructure = xml.includes('<score-partwise') && 
                             xml.includes('</score-partwise>') && 
                             xml.includes('<part-list>') && 
                             xml.includes('<measure');
    const isXmlParsable = XMLValidator.validate(xml) === true;
    return isValidStructure && isXmlParsable;
}

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

if (!validateMusicXML(validXML)) {
    throw new Error("Valid XML failed validation");
}
console.log("✅ Valid XML passed");

const invalidXML1 = "<score-partwise>missing close tag";
if (validateMusicXML(invalidXML1)) {
    throw new Error("Invalid XML (missing close) passed validation");
}
console.log("✅ Invalid XML (missing close) caught");

const invalidXML2 = "<score-partwise><part-list></part-list></score-partwise>"; // missing part/measure
if (validateMusicXML(invalidXML2)) {
    throw new Error("Invalid XML (missing measure) passed validation");
}
console.log("✅ Invalid XML (missing structure) caught");

console.log("🚀 ALL MUSICXML VALIDATION TESTS PASSED");
