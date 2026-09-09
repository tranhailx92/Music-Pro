import React, { useState, useRef, useEffect } from 'react';
import { XMLValidator } from 'fast-xml-parser';
import { Sparkles, FileMusic, Loader2, ArrowRight, Save, Music, Download, Copy, Headphones, Play, Pause } from 'lucide-react';
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
  const [style, setStyle] = useState('STYLE.VN.VPOP-BALLAD');
  
  const [metaPrompt, setMetaPrompt] = useState('');
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
  
  // AI Audio Production State
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<{ lyriaEnabled: boolean; textModel: string } | null>(null);

  useEffect(() => {
    fetch('/api/music/capabilities')
      .then(res => res.json())
      .then(setCapabilities)
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleGenerateAudio = async () => {
    if (!finalXml) return;
    setGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const res = await fetch('/api/music/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicXml: finalXml, style, idea })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Lỗi tạo audio');
      }
      
      if (!data.audioBase64 || typeof data.audioBase64 !== "string") {
        throw new Error("Dữ liệu âm thanh từ máy chủ không hợp lệ.");
      }
      
      const binaryString = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      addToast('Tạo bản thu AI thành công!');
    } catch (e: any) {
      addToast('Lỗi: ' + e.message);
    } finally {
      setGeneratingAudio(false);
    }
  };

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
      if (!res.ok) throw new Error(data.error?.message || "Không thể tạo thông tin bản thu.");
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
      const res = await fetch('/api/compose/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, styleId: style })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi chuẩn bị sáng tác');
      
      setComposePrompt(data.composePrompt);
      setArrangePrompt(data.arrangePrompt);
      setComposeDocRefs(data.composeDocRefs);
      setArrangeDocRefs(data.arrangeDocRefs);
      setMetaPlan(data.metaPlan);
      setPlanSummary(data.planSummary);
      setSongRequest(data.songRequest);
      setStep(2);
      addToast('Đã hoàn thành bước Hiểu ý tưởng');
    } catch (e: any) {
      addToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToStep3 = () => {
    setStep(3);
  };

  const handleGenerateLeadSheet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compose/lead-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composePrompt, composeDocRefs, metaPlan, songRequest, styleId: style })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo bản nhạc');
      
      setLeadSheetXml(data.xml);
      setStep(4);
      addToast('Đã tạo bản nhạc (Lead Sheet)');
    } catch (e: any) {
      addToast('Tạo bản nhạc thất bại: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArrangement = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compose/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadSheetXml, arrangePrompt, arrangeDocRefs, songRequest, styleId: style })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi phối khí');
      
      setFinalXml(data.xml);
      
      // Save Run
      await runsService.saveRun({
        idea,
        style,
        metaPrompt: metaPlan,
        composePrompt,
        arrangePrompt,
        musicXml: data.xml,
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
            <h1 className="text-3xl font-bold">Sáng tác</h1>
            <p className="text-zinc-400">Từ ý tưởng đến bản nhạc hoàn chỉnh</p>
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
            <h2 className="text-xl font-bold text-white">Bước 1: Hiểu ý tưởng</h2>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Phong cách</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="STYLE.VN.VPOP-BALLAD">V-Pop Ballad</option>
                  <option value="STYLE.VN.BOLERO-TRU-TINH">Bolero / Trữ tình</option>
                  <option value="STYLE.VN.DAN-CA-CONTEMPORARY">Dân ca đương đại</option>
                  <option value="STYLE.VN.ACOUSTIC-INDIE">Acoustic Indie</option>
                  <option value="STYLE.VN.HEROIC-MARCH">Hành khúc (Heroic March)</option>
                  <option value="STYLE.POP.BALLAD-GENERIC">Pop Ballad (Generic)</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Ý tưởng / Chủ đề</label>
                <textarea 
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  className="flex-1 w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="VD: Một bài hát về nỗi nhớ quê hương, sử dụng hình ảnh con đò và dòng sông..."
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
                Hiểu ý tưởng
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 2: Phương án sáng tác</h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showAdvanced ? 'Ẩn nâng cao' : 'Chế độ nâng cao'}
              </button>
            </div>
            
            <div className="bg-black/30 border border-white/5 rounded-xl p-6">
              <h3 className="text-indigo-400 font-bold mb-3 uppercase text-xs tracking-widest">Tóm tắt phương án</h3>
              <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{planSummary}</p>
            </div>

            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Meta Plan</label>
                  <pre className="w-full h-32 overflow-auto bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap">
                    {metaPlan}
                  </pre>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Song Request</label>
                  <pre className="w-full h-32 overflow-auto bg-black border border-white/10 rounded-lg p-2 text-[10px] font-mono text-zinc-400 whitespace-pre-wrap">
                    {JSON.stringify(songRequest, null, 2)}
                  </pre>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Knowledge Refs (Compose / Arrange)</label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] text-zinc-600 w-full">Compose:</span>
                      {composeDocRefs.map(ref => (
                        <span key={ref} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-zinc-400">{ref}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[10px] text-zinc-600 w-full">Arrange:</span>
                      {arrangeDocRefs.map(ref => (
                        <span key={ref} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-zinc-400">{ref}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Compose Prompt</label>
                    <textarea 
                      value={composePrompt}
                      onChange={(e) => setComposePrompt(e.target.value)}
                      className="w-full h-32 bg-black border border-white/10 rounded-lg p-2 text-xs font-mono text-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Arrange Prompt</label>
                    <textarea 
                      value={arrangePrompt}
                      onChange={(e) => setArrangePrompt(e.target.value)}
                      className="w-full h-32 bg-black border border-white/10 rounded-lg p-2 text-xs font-mono text-zinc-400"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button 
                onClick={handleGoToStep3}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Tiếp tục
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 3: Bản nhạc</h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showAdvanced ? 'Ẩn lệnh' : 'Xem lệnh sáng tác'}
              </button>
            </div>
            
            <div className="flex gap-6 flex-1 min-h-0">
              {showAdvanced && (
                <div className="w-1/3 flex flex-col gap-4 animate-in slide-in-from-left duration-300">
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lệnh sáng tác</label>
                    <textarea 
                      value={composePrompt}
                      onChange={(e) => setComposePrompt(e.target.value)}
                      className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}
              <div className={`${showAdvanced ? 'w-2/3' : 'w-full'} flex flex-col bg-black rounded-xl border border-white/10 overflow-hidden relative`}>
                 {leadSheetXml ? (
                    <div className="flex-1 overflow-auto">
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button 
                          onClick={() => handleDownload(leadSheetXml, `${idea}_lead_sheet`)}
                          className="bg-zinc-900/80 hover:bg-zinc-800 p-2 rounded-lg border border-white/10 text-white"
                          title="Tải Lead Sheet"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <MusicXMLViewer xmlContent={leadSheetXml} />
                    </div>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                      <Music className="w-16 h-16 mb-4 opacity-50" />
                      <p>Bản nhạc sẽ hiển thị tại đây</p>
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
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {leadSheetXml ? 'Tạo lại bản nhạc' : 'Bắt đầu sáng tác'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 4: Phối khí</h2>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                {showAdvanced ? 'Ẩn lệnh' : 'Xem lệnh phối khí'}
              </button>
            </div>
            
            <div className="flex gap-6 flex-1 min-h-0">
              {showAdvanced && (
                <div className="w-1/3 flex flex-col gap-4 animate-in slide-in-from-left duration-300">
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Lệnh phối khí</label>
                    <textarea 
                      value={arrangePrompt}
                      onChange={(e) => setArrangePrompt(e.target.value)}
                      className="flex-1 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}
              <div className={`${showAdvanced ? 'w-2/3' : 'w-full'} flex flex-col bg-black rounded-xl border border-white/10 overflow-hidden relative`}>
                 {finalXml ? (
                    <div className="flex-1 overflow-auto">
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button 
                          onClick={() => handleDownload(finalXml, `${idea}_arrangement`)}
                          className="bg-zinc-900/80 hover:bg-zinc-800 p-2 rounded-lg border border-white/10 text-white"
                          title="Tải Bản phối"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                      <MusicXMLViewer xmlContent={finalXml} />
                    </div>
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
                {finalXml ? 'Tạo lại bản phối' : 'Phối khí & Lưu'}
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
                  Biến bản nhạc đã hoàn thành thành một bản thu AI. Bản thu sẽ cố gắng bám sát bản sáng tác nhưng có thể có khác biệt.
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
                    
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <button
                          onClick={handleCopyGeminiBrief}
                          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Sao chép cho Gemini
                        </button>
                        <button
                          onClick={handleGenerateAudio}
                          disabled={generatingAudio || !capabilities?.lyriaEnabled}
                          title={!capabilities?.lyriaEnabled ? "Chưa bật trong môi trường DEV – Lyria yêu cầu billing." : ""}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${capabilities?.lyriaEnabled ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600/50 text-white/50 cursor-not-allowed'}`}
                        >
                          {generatingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
                          Tạo bản thu AI
                        </button>
                      </div>
                      {!capabilities?.lyriaEnabled && (
                        <p className="text-sm text-yellow-500 mt-2">Chưa bật trong môi trường DEV – Lyria yêu cầu billing.</p>
                      )}
                      
                      {audioUrl && (
                        <div className="mt-4 p-4 bg-black/40 rounded-xl border border-indigo-500/30 flex flex-col gap-4">
                           <h4 className="font-bold text-white flex items-center gap-2">
                             <Play className="w-4 h-4 text-emerald-400" />
                             Bản thu AI đã sẵn sàng
                           </h4>
                           <audio controls src={audioUrl} className="w-full" />
                           <a 
                             href={audioUrl} 
                             download={`${idea ? idea.substring(0,20).replace(/\s+/g,'_') : 'Composition'}_AI_recording.mp3`}
                             className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                           >
                             <Download className="w-4 h-4" />
                             Tải MP3
                           </a>
                        </div>
                      )}
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
