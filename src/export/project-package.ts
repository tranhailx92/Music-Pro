import type { MusicProjectBundle } from '../projects/types';
import { activeRevision } from '../projects/revision-utils';
import { createStoreZip, type StoreZipEntry } from './zip-store';
const encoder=new TextEncoder();
function json(value:unknown):Uint8Array { return encoder.encode(JSON.stringify(value,null,2)); }
function text(value:string):Uint8Array { return encoder.encode(value); }
export async function buildProjectPackageBytes(bundle:MusicProjectBundle):Promise<Uint8Array>{
  const current=activeRevision(bundle); const lead=bundle.project.leadRevisionId?bundle.revisions.find(r=>r.id===bundle.project.leadRevisionId):undefined;
  const entries:StoreZipEntry[]=[
    {name:'project.json',data:json({format:'music-pro-project',version:1,project:bundle.project})},
    {name:'current.musicxml',data:text(current.musicXml)},
    {name:'revisions/index.json',data:json(bundle.revisions.map(({musicXml,...meta})=>meta))},
    {name:'README.txt',data:text('Music-Pro Project Package v1\nMusicXML is the canonical composition.\nOpen current.musicxml in Music-Pro or any MusicXML-compatible notation application.\n')},
  ];
  if(lead)entries.push({name:'lead.musicxml',data:text(lead.musicXml)});
  for(const revision of bundle.revisions)entries.push({name:`revisions/${revision.id}.musicxml`,data:text(revision.musicXml)});
  return createStoreZip(entries);
}
export async function buildProjectPackage(bundle:MusicProjectBundle):Promise<Blob>{ return new Blob([await buildProjectPackageBytes(bundle)],{type:'application/zip'}); }
