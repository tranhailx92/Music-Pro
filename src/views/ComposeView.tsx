import React, { useState } from 'react';
import { Sparkles, FileMusic, Loader2, ArrowRight, Save, Music, Download, Copy, Headphones } from 'lucide-react';
import { generateWithAI } from '../services/ai';
import { knowledgeService } from '../services/knowledge';
import { runsService } from '../services/runs';
import { MusicXMLViewer } from '../components/MusicXMLViewer';
import { useToast } from '../hooks/useToast';

type Step = 1 | 2 | 3 | 4;

export const ComposeView: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // State
  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState('V-Pop Ballad');
  
  const [metaPrompt, setMetaPrompt] = useState('');
  const [composePrompt, setComposePrompt] = useState('');
  const [arrangePrompt, setArrangePrompt] = useState('');
  
  const [leadSheetXml, setLeadSheetXml] = useState('');
  const [finalXml, setFinalXml] = useState('');
  
  // AI Audio Production State
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  
  const handleGenerateBlueprint = async () => {
    setGeneratingBlueprint(true);
    try {
      const res = await fetch('/api/music/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          musicXml: finalXml,
          style: style,
          idea: idea
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBlueprintData(data);
      addToast('Đã phân tích thông tin bản thu AI');
    } catch (e: any) {
      addToast('Lỗi: ' + e.message);
    } finally {
      setGeneratingBlueprint(false);
    }
  };

  const handleCopyGeminiBrief = () => {
    if (blueprintData?.geminiBrief) {
      navigator.clipboard.writeText(blueprintData.geminiBrief);
      addToast('Đã sao chép yêu cầu cho Gemini');
    }
  };

  const handleDownload = (xml: string, filename: string) => {
    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\\s+/g, '_')}.musicxml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleGenerateMetaPrompt = async () => {
    if (!idea) return addToast('Vui lòng nhập ý tưởng');
    setLoading(true);
    try {
      const systemInst = "You are an expert music composer AI. Generate a meta-prompt for a 4-step music composition pipeline based on the user's idea. The meta-prompt should outline the emotional arc, structure, and required knowledge references.";
      const prompt = `Idea: ${idea}\nStyle: ${style}\n\nGenerate the meta-prompt.`;
      
      const res = await generateWithAI(prompt, systemInst);
      setMetaPrompt(res);
      setStep(2);
      addToast('Đã tạo siêu lệnh (Meta-prompt)');
    } catch (e: any) {
      addToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCraftPrompts = async () => {
    setLoading(true);
    try {
      const catalog = await knowledgeService.getDocById('catalog');
      const systemInst = `You are an AI prompt engineer. Use this catalog to select DOC_REFS:\n${catalog?.content || 'No catalog found'}\n\nBased on the meta-prompt, generate a 'compose-prompt' (for lead sheet) and an 'arrange-prompt' (for full orchestration). Format as JSON: { "composePrompt": "...", "arrangePrompt": "..." }`;
      
      const res = await generateWithAI(`Meta-Prompt:\n${metaPrompt}`, systemInst);
      
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI did not return valid JSON");
      const parsed = JSON.parse(jsonMatch[0]);
      
      setComposePrompt(parsed.composePrompt);
      setArrangePrompt(parsed.arrangePrompt);
      setStep(3);
      addToast('Đã tạo các lệnh nháp');
    } catch (e: any) {
      addToast('Tạo lệnh thất bại: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeadSheet = async () => {
    setLoading(true);
    try {
      const systemInst = "You are a master composer. Output ONLY valid MusicXML 4.0 containing a lead sheet (melody, lyrics, chords). Do not use markdown blocks, just raw XML.";
      const res = await generateWithAI(composePrompt, systemInst);
      
      const xmlMatch = res.match(/<score-partwise[\s\S]*<\/score-partwise>/i);
      const xml = xmlMatch ? xmlMatch[0] : res.replace(/```xml/g, '').replace(/```/g, '').trim();
      
      setLeadSheetXml(xml);
      setStep(4);
      addToast('Đã tạo bản ký âm (Lead Sheet)');
    } catch (e: any) {
      addToast('Tạo bản ký âm thất bại: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArrangement = async () => {
    setLoading(true);
    try {
      const systemInst = "You are an expert arranger. Output ONLY valid MusicXML 4.0 containing a full arrangement based on the provided lead sheet. Do not use markdown blocks, just raw XML.";
      const prompt = `Arrange Prompt:\n${arrangePrompt}\n\nLead Sheet Context:\n${leadSheetXml}`;
      const res = await generateWithAI(prompt, systemInst);
      
      const xmlMatch = res.match(/<score-partwise[\s\S]*<\/score-partwise>/i);
      const xml = xmlMatch ? xmlMatch[0] : res.replace(/```xml/g, '').replace(/```/g, '').trim();
      
      setFinalXml(xml);
      
      // Save Run
      await runsService.saveRun({
        idea,
        style,
        metaPrompt,
        composePrompt,
        arrangePrompt,
        musicXml: xml,
        status: 'completed'
      });
      
      addToast('Đã phối khí xong & lưu vào Lịch sử!');
    } catch (e: any) {
      addToast('Phối khí thất bại: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sáng tác mới</h1>
            <p className="text-zinc-400">Quy trình sáng tác 4 bước (MusicXML)</p>
          </div>
        </div>
        
        {/* Progress Tracker */}
        <div className="hidden md:flex items-center gap-2 text-sm font-medium">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= s ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-700 text-zinc-500'}`}>
                {s}
              </div>
              {s < 4 && <div className={`w-8 h-[2px] ${step > s ? 'bg-indigo-600' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
        {step === 1 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white">Bước 1: Ý tưởng</h2>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Phong cách tham chiếu</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option>V-Pop Ballad</option>
                  <option>Bolero</option>
                  <option>Contemporary Folk</option>
                  <option>Acoustic Indie</option>
                  <option>Heroic March</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Ý tưởng / Chủ đề âm nhạc</label>
                <textarea 
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="flex-1 w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="VD: Một bản V-Pop ballad về một buổi chiều mưa ở Hà Nội, sử dụng guitar acoustic và piano..."
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleGenerateMetaPrompt}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Tạo siêu lệnh (Meta-Prompt)
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white">Bước 2: Xây dựng siêu lệnh</h2>
            <p className="text-sm text-zinc-400">Xem lại và tinh chỉnh cách tiếp cận trước khi tạo các lệnh sáng tác chi tiết.</p>
            <textarea 
              value={metaPrompt}
              onChange={(e) => setMetaPrompt(e.target.value)}
              className="flex-1 w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm resize-none"
            />
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button 
                onClick={handleCraftPrompts}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                Tạo các bộ lệnh
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white">Bước 3: Bản ký âm (Giai đoạn 1)</h2>
            <div className="flex gap-6 flex-1 min-h-0">
              <div className="w-1/3 flex flex-col gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lệnh sáng tác</label>
                  <textarea 
                    value={composePrompt}
                    onChange={(e) => setComposePrompt(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  {leadSheetXml && (
                    <button 
                      onClick={() => handleDownload(leadSheetXml, `${idea}_lead_sheet`)}
                      className="mt-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải Lead Sheet
                    </button>
                  )}
                </div>
              </div>
              <div className="w-2/3 flex flex-col bg-black rounded-xl border border-white/10 overflow-hidden relative">
                 {leadSheetXml ? (
                    <div className="flex-1 overflow-auto"><MusicXMLViewer xmlContent={leadSheetXml} /></div>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                      <Music className="w-16 h-16 mb-4 opacity-50" />
                      <p>Bản ký âm sẽ hiển thị tại đây</p>
                    </div>
                 )}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <div className="flex gap-2">
                <button 
                  onClick={handleGenerateLeadSheet}
                  disabled={loading}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  {loading && !leadSheetXml ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {leadSheetXml ? 'Tạo lại' : 'Tạo bản ký âm'}
                </button>
                {leadSheetXml && (
                  <button 
                    onClick={() => setStep(4)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    Tiếp tục phối khí
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white">Bước 4: Phối khí hoàn thiện</h2>
            <div className="flex gap-6 flex-1 min-h-0">
              <div className="w-1/3 flex flex-col gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lệnh phối khí</label>
                  <textarea 
                    value={arrangePrompt}
                    onChange={(e) => setArrangePrompt(e.target.value)}
                    className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  {finalXml && (
                    <button 
                      onClick={() => handleDownload(finalXml, `${idea}_arrangement`)}
                      className="mt-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải Bản phối
                    </button>
                  )}
                </div>
              </div>
              <div className="w-2/3 flex flex-col bg-black rounded-xl border border-white/10 overflow-hidden relative">
                 {finalXml ? (
                    <div className="flex-1 overflow-auto"><MusicXMLViewer xmlContent={finalXml} /></div>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                      <Music className="w-16 h-16 mb-4 opacity-50" />
                      <p>Bản phối đầy đủ sẽ hiển thị tại đây</p>
                    </div>
                 )}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(3)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button 
                onClick={handleGenerateArrangement}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {finalXml ? 'Tạo lại bản phối' : 'Tạo & Lưu'}
              </button>
            </div>

            {/* AI Audio Section */}
            {finalXml && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-indigo-400" />
                  Tạo bản thu AI
                </h3>
                <p className="text-sm text-zinc-400 mb-6">
                  Sử dụng bản ký âm đã hoàn thành để tạo bản nhạc audio thực tế qua AI.
                </p>

                {!blueprintData ? (
                  <button
                    onClick={handleGenerateBlueprint}
                    disabled={generatingBlueprint}
                    className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    {generatingBlueprint ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Tạo thông tin bản thu
                  </button>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h4 className="font-bold text-white mb-4">Thông tin tạo bản thu</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Phong cách</span>
                        <span className="text-sm font-bold">{blueprintData.blueprint.identity.genre}</span>
                      </div>
                      <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">BPM / Nhịp</span>
                        <span className="text-sm font-bold">{blueprintData.blueprint.musical.tempo} / {blueprintData.blueprint.musical.meter}</span>
                      </div>
                      <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Cấu trúc</span>
                        <span className="text-sm font-bold truncate block">{blueprintData.blueprint.structure.map((s:any) => s.name).join(', ')}</span>
                      </div>
                      <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                        <span className="text-xs text-zinc-500 block mb-1">Quãng giọng</span>
                        <span className="text-sm font-bold">{blueprintData.blueprint.musical.vocalRange || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button
                        onClick={handleCopyGeminiBrief}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Sao chép cho Gemini
                      </button>
                      <button
                        disabled
                        className="flex items-center gap-2 bg-indigo-600/50 text-white/50 px-5 py-2.5 rounded-lg font-bold text-sm cursor-not-allowed"
                      >
                        <Headphones className="w-4 h-4" />
                        Tạo bằng AI - Sắp có
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
