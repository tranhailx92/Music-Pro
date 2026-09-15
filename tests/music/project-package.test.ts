import { createStoreZip } from '../../src/export/zip-store';
import { buildProjectPackageBytes } from '../../src/export/project-package';
import type { MusicProjectBundle } from '../../src/projects/types';
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function main() {
const enc = new TextEncoder();
const small = createStoreZip([{name:'a.txt',data:enc.encode('hello')},{name:'b.txt',data:enc.encode('world')}]);
assert(String.fromCharCode(...small.slice(0,4)) === 'PK\x03\x04', 'zip local header');
const bundle: MusicProjectBundle = {
 project:{id:'p1',title:'Song',idea:'Idea',style:'STYLE.VN.VPOP-BALLAD',createdAt:1,updatedAt:2,activeRevisionId:'r2',leadRevisionId:'r1',mix:{parts:{},masterGain:1,reverb:.1,normalizeExport:true},tags:[]},
 revisions:[
  {id:'r1',projectId:'p1',label:'Lead',reason:'compose',musicXml:'<score-partwise id="lead"/>',createdAt:1},
  {id:'r2',projectId:'p1',parentRevisionId:'r1',label:'Final',reason:'arrange',musicXml:'<score-partwise id="final"/>',createdAt:2},
 ]
};
const bytes = await buildProjectPackageBytes(bundle);
const text = new TextDecoder('latin1').decode(bytes);
for (const name of ['project.json','current.musicxml','lead.musicxml','revisions/index.json','revisions/r1.musicxml','revisions/r2.musicxml','README.txt']) assert(text.includes(name), `missing ${name}`);
assert(!text.includes('GeneralUserGS.sf3'), 'must not include SoundFont');
assert(!/GEMINI_API_KEY|AIza/.test(text), 'must not include API key');
console.log('PROJECT PACKAGE TESTS PASSED');
}
void main();
