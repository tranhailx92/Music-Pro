
import { generateLeadSheet, generateArrangement } from '../../server/music/composer';
import { extractSongDNA } from '../../server/music/song-dna';
import fs from 'fs';

const verify = async () => {
  try {
    console.log("Loading Step 1/2 artifacts...");
    const step2 = JSON.parse(fs.readFileSync('golden-01-vpop-step1-2.json', 'utf8'));
    
    console.log("Running Lead Sheet (Step 3) with patch...");
    let lead;
    try {
      lead = await generateLeadSheet(
        step2.composePrompt, 
        step2.composeDocRefs, 
        step2.metaPlan, 
        step2.songRequest, 
        "STYLE.VN.VPOP-BALLAD"
      );
    } catch (e: any) {
      console.error("generateLeadSheet THREW an error:");
      console.error(e.message);
      if (e.errors) console.error("Validation errors:", e.errors);
      if (e.xml) {
        console.log("XML was partially generated. Length:", e.xml.length);
        fs.writeFileSync('failed-lead-sheet.musicxml', e.xml);
      }
      throw e;
    }
    
    fs.writeFileSync('golden-01-vpop-lead-patched.musicxml', lead);
    const leadDna = extractSongDNA(lead);
    console.log(`Lead Sheet measures: ${leadDna.melody.length > 0 ? leadDna.melody[leadDna.melody.length - 1].measure : 0}`);
    console.log(`Lead Sheet duration: ${Math.round(leadDna.musical.approximateDuration || 0)} seconds`);

    if (leadDna.musical.approximateDuration && leadDna.musical.approximateDuration < 150) {
      const msg = `Lead sheet still too short: ${Math.round(leadDna.musical.approximateDuration || 0)}s`;
      console.error(msg);
      throw new Error(msg);
    }

    console.log("Running Arrangement (Step 4) with patch...");
    const arranged = await generateArrangement(
      lead, 
      step2.arrangePrompt, 
      step2.arrangeDocRefs, 
      step2.songRequest, 
      "STYLE.VN.VPOP-BALLAD"
    );
    
    fs.writeFileSync('golden-01-vpop-arranged-patched.musicxml', arranged);
    const arrDna = extractSongDNA(arranged);
    console.log(`Arrangement measures: ${arrDna.melody.length > 0 ? arrDna.melody[arrDna.melody.length - 1].measure : 0}`);
    console.log(`Arrangement duration: ${Math.round(arrDna.musical.approximateDuration || 0)} seconds`);

    console.log("VERIFICATION SUCCESSFUL");
  } catch(e: any) {
    console.error("VERIFICATION FAILED");
    console.error(e);
    if (e.xml) {
      fs.writeFileSync('failed-verification.musicxml', e.xml);
      console.log("Wrote failed XML to failed-verification.musicxml");
    }
    process.exit(1);
  }
};

verify();
