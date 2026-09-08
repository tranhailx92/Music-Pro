import { extractSongDNA } from './server/music/song-dna';
import { buildProductionBlueprint } from './server/music/production-blueprint';
import { buildGeminiMusicBrief } from './server/music/gemini-music-brief';

const validXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <work><work-title>Test Song</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>1</fifths><mode>major</mode></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <direction><sound tempo="120"/></direction>
      <harmony><root><root-step>G</root-step></root><kind text="maj">major</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><lyric><text>He</text><syllabic>begin</syllabic></lyric></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><lyric><text>llo</text><syllabic>end</syllabic></lyric></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note>
    </measure>
  </part>
</score-partwise>`;

try {
  console.log("--- A & B: XML Parser & Fingerprint ---");
  const dna = extractSongDNA(validXML);
  console.log("Title:", dna.identity.title);
  console.log("Key:", dna.musical.key);
  console.log("BPM:", dna.musical.tempoBpm);
  console.log("Meter:", dna.musical.timeSignature);
  console.log("Lyrics:", dna.lyrics.assembledLyric);
  console.log("Notes:", dna.fingerprint.pitchSequence.join(', '));
  console.log("Intervals:", dna.fingerprint.intervals.join(', '));
  console.log("Contour:", dna.fingerprint.contour.join(', '));
  
  console.log("\n--- C: Production Blueprint ---");
  const blueprint = buildProductionBlueprint(dna, { style: 'Pop', mood: 'Happy' });
  console.log("Genre:", blueprint.identity.genre);
  console.log("Main Motif:", blueprint.melodyIdentity.mainMotif);
  
  console.log("\n--- D: Gemini Brief ---");
  const brief = buildGeminiMusicBrief(blueprint);
  console.log(brief.substring(0, 150) + "...");
  console.log("Includes BPM?", brief.includes("120"));
  console.log("Includes Key?", brief.includes("G major"));
  
  console.log("\n--- E: Invalid XML ---");
  try {
    extractSongDNA("<invalid></invalid>");
    console.log("FAIL: Should have thrown error");
  } catch(e:any) {
    console.log("PASS: Caught error ->", e.message);
  }
} catch (e) {
  console.error("TEST FAILED", e);
}
