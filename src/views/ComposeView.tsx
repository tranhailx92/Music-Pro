import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Copy, Headphones, Loader2, Music, Save, Sparkles } from 'lucide-react';
import { ResultWorkspace } from '../components/ResultWorkspace';
import { createAutosaveController, shouldWarnBeforeUnload, type AutosaveController } from '../projects/autosave';
import { projectService } from '../projects/project-service';
import { workspaceTargetForStep, type WorkspaceScoreTarget } from '../projects/composition-session';
import type { MusicProjectBundle, RevisionReason } from '../projects/types';
import { runsService } from '../services/runs';
import { settingsService } from '../services/settings';
import { productErrorText } from '../utils/product-errors';
import { useToast } from '../hooks/useToast';

type Step = 1 | 2 | 3 | 4;

function activeXml(bundle: MusicProjectBundle): string {
  return bundle.revisions.find(revision => revision.id === bundle.project.activeRevisionId)?.musicXml || '';
}

export const ComposeView: React.FC = () => {
  const settings = settingsService.getSettings();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState(settings.defaultStyleId);
  const [composePrompt, setComposePrompt] = useState('');
  const [arrangePrompt, setArrangePrompt] = useState('');
  const [leadSheetXml, setLeadSheetXml] = useState('');
  const [finalXml, setFinalXml] = useState('');
  const [composeDocRefs, setComposeDocRefs] = useState<string[]>([]);
  const [arrangeDocRefs, setArrangeDocRefs] = useState<string[]>([]);
  const [metaPlan, setMetaPlan] = useState('');
  const [planSummary, setPlanSummary] = useState('');
  const [songRequest, setSongRequest] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [projectBundle, setProjectBundle] = useState<MusicProjectBundle | undefined>();
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<{ lyriaEnabled: boolean; textModel: string } | null>(null);
  const autosaveRef = useRef<AutosaveController<MusicProjectBundle> | null>(null);

  if (!autosaveRef.current) {
    autosaveRef.current = createAutosaveController({
      delayMs: 700,
      save: bundle => projectService.saveProject(bundle),
      onError: cause => { setSaveState('dirty'); addToast(productErrorText(cause, 'Không thể tự động lưu dự án.')); },
      onDirtyChange: dirty => setSaveState(dirty ? 'dirty' : 'saved'),
      onSavingChange: saving => { if (saving) setSaveState('saving'); },
    });
  }

  useEffect(() => {
    fetch('/api/music/capabilities').then(response => response.json()).then(setCapabilities).catch(() => setCapabilities(null));
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnBeforeUnload(saveState, autosaveRef.current?.isDirty() === true)) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState]);

  const scheduleSave = (bundle: MusicProjectBundle) => {
    setProjectBundle(bundle);
    if (settingsService.getSettings().autoSave) {
      autosaveRef.current?.schedule(bundle);
    } else {
      setSaveState('dirty');
    }
  };

  const saveProjectNow = async () => {
    if (!projectBundle) return;
    setSaveState('saving');
    try {
      if (autosaveRef.current?.isDirty()) await autosaveRef.current.flush();
      else await projectService.saveProject(projectBundle);
      setSaveState('saved');
    } catch (cause) {
      setSaveState('dirty');
      addToast(productErrorText(cause, 'Không thể lưu thay đổi dự án.'));
    }
  };

  const handleGenerateMetaPrompt = async () => {
    if (!idea.trim()) return addToast('Vui lòng nhập ý tưởng');
    setLoading(true);
    try {
      const response = await fetch('/api/compose/prepare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea, styleId: style }) });
      const data = await response.json();
      if (!response.ok) { const error:any = new Error(data.error?.message || data.error || 'Lỗi chuẩn bị sáng tác'); error.code=data.error?.code; throw error; }
      setComposePrompt(data.composePrompt); setArrangePrompt(data.arrangePrompt); setComposeDocRefs(data.composeDocRefs || []); setArrangeDocRefs(data.arrangeDocRefs || []); setMetaPlan(data.metaPlan || ''); setPlanSummary(data.planSummary || ''); setSongRequest(data.songRequest); setStep(2);
      addToast('Đã hoàn thành bước Hiểu ý tưởng');
    } catch (cause: any) { addToast(productErrorText(cause, cause?.message || 'Không thể chuẩn bị phương án sáng tác')); }
    finally { setLoading(false); }
  };

  const handleGenerateLeadSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/compose/lead-sheet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ composePrompt, composeDocRefs, metaPlan, songRequest, styleId: style }) });
      const data = await response.json();
      if (!response.ok) { const error:any=new Error(data.error?.message || data.error || 'Lỗi tạo bản nhạc'); error.code=data.error?.code; throw error; }
      const xml = data.xml as string;
      setLeadSheetXml(xml); setFinalXml(''); setBlueprintData(null); setStep(4);
      if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null);
      const bundle = projectBundle
        ? await projectService.appendRevision(projectBundle, { musicXml: xml, reason: 'compose', label: 'Lead Sheet' })
        : await projectService.createFromComposition({ title: idea.slice(0,100) || 'Bản nhạc Music-Pro', idea, style, musicXml: xml, reason: 'compose', label: 'Lead Sheet' });
      setProjectBundle(bundle); setSaveState('saved');
      addToast('Đã tạo và lưu Lead Sheet cục bộ. Có thể nghe ngay hoặc tiếp tục phối khí.');
    } catch (cause:any) { addToast(productErrorText(cause, `Tạo bản nhạc thất bại: ${cause?.message || 'Lỗi không xác định'}`)); }
    finally { setLoading(false); }
  };

  const saveCloudCompatibility = async (xml:string, bundle:MusicProjectBundle) => {
    try {
      const id = await runsService.saveRun({ idea, style, metaPrompt: metaPlan, composePrompt, arrangePrompt, musicXml: xml, leadMusicXml: leadSheetXml, finalMusicXml: xml, title: bundle.project.title, version: bundle.revisions.length, status: 'completed' }, bundle.project.id);
      if (id) addToast('Đã đồng bộ bản phối vào Lịch sử đám mây.');
    } catch { addToast('Không đồng bộ được đám mây. Bản lưu cục bộ vẫn an toàn.'); }
  };

  const handleGenerateArrangement = async () => {
    if (!leadSheetXml) return addToast('Cần tạo Bản nhạc trước khi phối khí.');
    setLoading(true);
    try {
      const response = await fetch('/api/compose/arrange', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({leadSheetXml,arrangePrompt,arrangeDocRefs,songRequest,styleId:style}) });
      const data=await response.json();
      if(!response.ok){const error:any=new Error(data.error?.message||data.error||'Lỗi phối khí');error.code=data.error?.code;throw error;}
      const xml=data.xml as string; setFinalXml(xml); setBlueprintData(null); if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(null);
      let bundle=projectBundle;
      if(bundle) bundle=await projectService.appendRevision(bundle,{musicXml:xml,reason:'arrange',label:'Bản phối'});
      else bundle=await projectService.createFromComposition({title:idea.slice(0,100)||'Bản phối Music-Pro',idea,style,musicXml:xml,reason:'arrange',label:'Bản phối'});
      setProjectBundle(bundle); setSaveState('saved'); addToast('Đã phối khí và lưu thành phiên bản mới.'); void saveCloudCompatibility(xml,bundle);
    }catch(cause:any){addToast(productErrorText(cause,`Phối khí thất bại: ${cause?.message||'Lỗi không xác định'}`));}finally{setLoading(false);}
  };

  const handleWorkspaceXml = async (
    nextXml:string,
    reason:RevisionReason|undefined,
    label:string|undefined,
    target:WorkspaceScoreTarget,
  ) => {
    if (target === 'final') setFinalXml(nextXml); else setLeadSheetXml(nextXml);
    setBlueprintData(null); if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(null);
    if (reason && projectBundle) {
      try {
        const next=await projectService.appendRevision(projectBundle,{musicXml:nextXml,reason,label,promoteToLead:target==='lead'});
        setProjectBundle(next); setSaveState('saved');
      }
      catch(cause){addToast(productErrorText(cause,'Bản chỉnh sửa đang hiển thị nhưng chưa lưu được phiên bản.'));}
    }
  };

  const handleProjectChange = (bundle:MusicProjectBundle) => {
    scheduleSave(bundle);
    const xml=activeXml(bundle);
    const leadRevision=bundle.project.leadRevisionId ? bundle.revisions.find(item=>item.id===bundle.project.leadRevisionId) : undefined;
    if (bundle.project.activeRevisionId === bundle.project.leadRevisionId) {
      setLeadSheetXml(xml);
      setFinalXml('');
    } else {
      if (leadRevision) setLeadSheetXml(leadRevision.musicXml);
      setFinalXml(xml);
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!finalXml) return; setGeneratingBlueprint(true);
    try { const response=await fetch('/api/music/blueprint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({musicXml:finalXml,style,idea})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Không thể tạo thông tin bản thu.');setBlueprintData(data);addToast('Đã phân tích thông tin bản thu AI'); }
    catch(cause:any){addToast(productErrorText(cause,cause?.message));}finally{setGeneratingBlueprint(false);}
  };
  const handleGenerateAudio = async () => {
    if(!finalXml)return;setGeneratingAudio(true);
    try{const response=await fetch('/api/music/generate-audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({musicXml:finalXml,style,idea})});const data=await response.json();if(!response.ok){const e:any=new Error(data.error?.message||'Lỗi tạo audio');e.code=data.error?.code;throw e;}const binary=atob(data.audioBase64);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);if(audioUrl)URL.revokeObjectURL(audioUrl);setAudioUrl(URL.createObjectURL(new Blob([bytes],{type:data.mimeType||'audio/mpeg'})));addToast('Tạo bản thu AI thành công!');}
    catch(cause:any){addToast(productErrorText(cause,cause?.message));}finally{setGeneratingAudio(false);}
  };

  return <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto h-full flex flex-col">
    <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center"><Sparkles className="w-6 h-6"/></div><div><h1 className="text-3xl font-bold">Sáng tác</h1><p className="text-zinc-400">Ý tưởng → Bản nhạc → Nghe → Phối khí → Chỉnh → Xuất</p></div></div><div className="hidden md:flex items-center gap-2">{[1,2,3,4].map(n=><React.Fragment key={n}><div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step>=n?'bg-indigo-600 border-indigo-600':'border-zinc-700 text-zinc-500'}`}>{n}</div>{n<4&&<div className={`w-8 h-0.5 ${step>n?'bg-indigo-600':'bg-zinc-800'}`}/>}</React.Fragment>)}</div></div>
    <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col">
      {step===1&&<div className="space-y-6 flex-1 flex flex-col"><h2 className="text-xl font-bold">Bước 1: Hiểu ý tưởng</h2><label className="text-sm text-zinc-400">Phong cách<select value={style} onChange={e=>setStyle(e.target.value)} className="mt-2 w-full bg-black border border-white/10 rounded-xl p-3 text-white"><option value="STYLE.VN.VPOP-BALLAD">V-Pop Ballad</option><option value="STYLE.VN.BOLERO-TRU-TINH">Bolero / Trữ tình</option><option value="STYLE.VN.DAN-CA-CONTEMPORARY">Dân ca đương đại</option><option value="STYLE.VN.ACOUSTIC-INDIE">Acoustic Indie</option><option value="STYLE.VN.HEROIC-MARCH">Hành khúc</option></select></label><label className="flex-1 flex flex-col text-sm text-zinc-400">Ý tưởng / Chủ đề<textarea value={idea} onChange={e=>setIdea(e.target.value)} className="mt-2 flex-1 min-h-56 bg-black border border-white/10 rounded-xl p-4 text-white" placeholder="VD: Một bài hát về nỗi nhớ quê hương…"/></label><div className="flex justify-end"><button onClick={handleGenerateMetaPrompt} disabled={loading} className="inline-flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50">{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<Sparkles className="w-5 h-5"/>}Hiểu ý tưởng</button></div></div>}
      {step===2&&<div className="space-y-5 flex-1 overflow-auto"><div className="flex justify-between"><h2 className="text-xl font-bold">Bước 2: Phương án sáng tác</h2><button onClick={()=>setShowAdvanced(v=>!v)} className="text-xs text-zinc-500">{showAdvanced?'Ẩn nâng cao':'Chế độ nâng cao'}</button></div><div className="rounded-xl bg-black/30 border border-white/5 p-6"><h3 className="text-xs font-bold text-indigo-400 uppercase mb-3">Tóm tắt phương án</h3><p className="whitespace-pre-wrap">{planSummary}</p></div>{showAdvanced&&<div className="grid md:grid-cols-2 gap-4"><textarea value={composePrompt} onChange={e=>setComposePrompt(e.target.value)} className="h-40 bg-black rounded-xl p-3 text-xs font-mono"/><textarea value={arrangePrompt} onChange={e=>setArrangePrompt(e.target.value)} className="h-40 bg-black rounded-xl p-3 text-xs font-mono"/></div>}<div className="flex justify-between"><button onClick={()=>setStep(1)} className="px-5 py-3 text-zinc-400">Quay lại</button><button onClick={()=>setStep(3)} className="inline-flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-xl font-bold">Tiếp tục<ArrowRight className="w-5 h-5"/></button></div></div>}
      {step===3&&<div className="space-y-5 flex-1 min-h-0 flex flex-col"><h2 className="text-xl font-bold">Bước 3: Bản nhạc</h2>{leadSheetXml?<ResultWorkspace xmlContent={leadSheetXml} title={idea||'Lead Sheet'} projectBundle={projectBundle} saveState={saveState} onSaveProject={() => void saveProjectNow()} onProjectChange={handleProjectChange} onChangeXml={(xml,reason,label)=>void handleWorkspaceXml(xml,reason,label,workspaceTargetForStep(3,Boolean(finalXml)))}/>:<div className="flex-1 flex items-center justify-center rounded-xl border border-white/10 bg-black text-zinc-600"><Music className="w-12 h-12"/></div>}<div className="flex justify-between"><button onClick={()=>setStep(2)} className="px-5 py-3 text-zinc-400">Quay lại</button><button onClick={handleGenerateLeadSheet} disabled={loading} className="inline-flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50">{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<Sparkles className="w-5 h-5"/>}{leadSheetXml?'Tạo lại bản nhạc':'Bắt đầu sáng tác'}</button></div></div>}
      {step===4&&<div className="space-y-5 flex-1 min-h-0 flex flex-col overflow-auto"><h2 className="text-xl font-bold">Bước 4: Phối khí & Sản phẩm</h2>{(finalXml||leadSheetXml)?<ResultWorkspace xmlContent={finalXml||leadSheetXml} title={idea||'Music-Pro'} subtitle={finalXml?'Bản phối hoàn chỉnh':'Lead Sheet hiện tại'} filenameBase={idea||'music-pro-song'} projectBundle={projectBundle} saveState={saveState} onSaveProject={() => void saveProjectNow()} onProjectChange={handleProjectChange} onChangeXml={(xml,reason,label)=>void handleWorkspaceXml(xml,reason,label,workspaceTargetForStep(4,Boolean(finalXml)))}/>:<div className="min-h-80 flex items-center justify-center text-zinc-600"><Music className="w-12 h-12"/></div>}<div className="flex justify-between"><button onClick={()=>setStep(3)} className="px-5 py-3 text-zinc-400">Quay lại</button><button onClick={handleGenerateArrangement} disabled={loading||!leadSheetXml} className="inline-flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-xl font-bold disabled:opacity-50">{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<Save className="w-5 h-5"/>}{finalXml?'Tạo lại bản phối':'Phối khí'}</button></div>
        {finalXml&&<div className="border-t border-white/10 pt-6"><h3 className="text-lg font-bold flex items-center gap-2"><Headphones className="w-5 h-5 text-indigo-400"/>Studio Version — bản thu AI tùy chọn</h3><p className="text-sm text-zinc-400 mt-1 mb-4">MusicXML vẫn là master; bản thu AI là lớp trình diễn riêng.</p>{!blueprintData?<button onClick={handleGenerateBlueprint} disabled={generatingBlueprint} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/20 text-emerald-300 px-5 py-3 font-bold">{generatingBlueprint?<Loader2 className="w-4 h-4 animate-spin"/>:<Sparkles className="w-4 h-4"/>}Tạo thông tin bản thu</button>:<div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"><div className="text-sm text-zinc-300">Model text: {capabilities?.textModel||'server default'}</div><div className="flex flex-wrap gap-2"><button onClick={()=>{void navigator.clipboard.writeText(blueprintData.geminiBrief||'');addToast('Đã sao chép Music Brief');}} className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm"><Copy className="w-4 h-4"/>Sao chép Music Brief</button><button onClick={handleGenerateAudio} disabled={generatingAudio||!capabilities?.lyriaEnabled} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold disabled:opacity-40">{generatingAudio?'Đang tạo…':'Tạo bản thu AI'}</button></div>{audioUrl&&<audio controls src={audioUrl} className="w-full"/>}</div>}</div>}
      </div>}
    </div>
  </div>;
};
