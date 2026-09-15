import React, { useEffect, useState } from 'react';
import { ArrowRight, Copy, Download, Headphones, Loader2, Music, Play, Save, Sparkles } from 'lucide-react';
import { ResultWorkspace } from '../components/ResultWorkspace';
import { useToast } from '../hooks/useToast';
import { runsService } from '../services/runs';

type Step = 1 | 2 | 3 | 4;

export const ComposeView: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const [idea, setIdea] = useState('');
  const [style, setStyle] = useState('STYLE.VN.VPOP-BALLAD');
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

  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<{ lyriaEnabled: boolean; textModel: string } | null>(null);

  useEffect(() => {
    fetch('/api/music/capabilities')
      .then(response => response.json())
      .then(setCapabilities)
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleGenerateMetaPrompt = async () => {
    if (!idea.trim()) return addToast('Vui lòng nhập ý tưởng');
    setLoading(true);
    try {
      const response = await fetch('/api/compose/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, styleId: style }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || 'Lỗi chuẩn bị sáng tác');
      setComposePrompt(data.composePrompt);
      setArrangePrompt(data.arrangePrompt);
      setComposeDocRefs(data.composeDocRefs || []);
      setArrangeDocRefs(data.arrangeDocRefs || []);
      setMetaPlan(data.metaPlan || '');
      setPlanSummary(data.planSummary || '');
      setSongRequest(data.songRequest);
      setStep(2);
      addToast('Đã hoàn thành bước Hiểu ý tưởng');
    } catch (cause: any) {
      addToast(cause?.message || 'Không thể chuẩn bị phương án sáng tác');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeadSheet = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/compose/lead-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composePrompt, composeDocRefs, metaPlan, songRequest, styleId: style }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || 'Lỗi tạo bản nhạc');
      setLeadSheetXml(data.xml);
      setFinalXml('');
      setBlueprintData(null);
      setAudioUrl(null);
      setStep(4);
      addToast('Đã tạo bản nhạc. Có thể nghe ngay hoặc tiếp tục phối khí.');
    } catch (cause: any) {
      addToast(`Tạo bản nhạc thất bại: ${cause?.message || 'Lỗi không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  const persistCompletedRun = async (xml: string) => {
    try {
      const runId = await runsService.saveRun({
        idea,
        style,
        metaPrompt: metaPlan,
        composePrompt,
        arrangePrompt,
        musicXml: xml,
        leadMusicXml: leadSheetXml,
        finalMusicXml: xml,
        title: idea.slice(0, 100),
        version: 1,
        status: 'completed',
      });
      if (runId) addToast('Đã lưu bản phối vào Lịch sử.');
      else addToast('Bản phối đã tạo thành công. Firebase chưa cấu hình nên chưa lưu Lịch sử; hãy tải file xuống để giữ bản nhạc.');
    } catch (cause) {
      console.warn('Composition succeeded but history persistence failed:', cause);
      addToast('Bản phối đã tạo thành công. Chưa lưu được Lịch sử; hãy tải file xuống để giữ bản nhạc.');
    }
  };

  const handleGenerateArrangement = async () => {
    if (!leadSheetXml) return addToast('Cần tạo Bản nhạc trước khi phối khí.');
    setLoading(true);
    try {
      const response = await fetch('/api/compose/arrange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadSheetXml, arrangePrompt, arrangeDocRefs, songRequest, styleId: style }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || 'Lỗi phối khí');
      setFinalXml(data.xml);
      setBlueprintData(null);
      setAudioUrl(null);
      addToast('Đã phối khí xong. Có thể nghe và tải MusicXML / MIDI / WAV ngay.');
      await persistCompletedRun(data.xml);
    } catch (cause: any) {
      addToast(`Phối khí thất bại: ${cause?.message || 'Lỗi không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!finalXml) return;
    setGeneratingBlueprint(true);
    try {
      const response = await fetch('/api/music/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicXml: finalXml, style, idea }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Không thể tạo thông tin bản thu.');
      setBlueprintData(data);
      addToast('Đã phân tích thông tin bản thu AI');
    } catch (cause: any) {
      addToast(`Lỗi: ${cause?.message || 'Không thể tạo Blueprint'}`);
    } finally {
      setGeneratingBlueprint(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!finalXml) return;
    setGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const response = await fetch('/api/music/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ musicXml: finalXml, style, idea }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Lỗi tạo audio');
      if (!data.audioBase64 || typeof data.audioBase64 !== 'string') {
        throw new Error('Dữ liệu âm thanh từ máy chủ không hợp lệ.');
      }
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
      setAudioUrl(URL.createObjectURL(blob));
      addToast('Tạo bản thu AI thành công!');
    } catch (cause: any) {
      addToast(`Lỗi: ${cause?.message || 'Không thể tạo bản thu AI'}`);
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handleCopyGeminiBrief = () => {
    if (!blueprintData?.geminiBrief) return;
    void navigator.clipboard.writeText(blueprintData.geminiBrief);
    addToast('Đã sao chép yêu cầu cho Gemini');
  };

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Sáng tác</h1>
            <p className="text-zinc-400">Từ ý tưởng đến bản nhạc có thể nghe và sử dụng ngay</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm font-medium">
          {[1, 2, 3, 4].map(number => (
            <div key={number} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= number ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-700 text-zinc-500'}`}>
                {number}
              </div>
              {number < 4 && <div className={`w-8 h-[2px] ${step > number ? 'bg-indigo-600' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col">
        {step === 1 && (
          <div className="space-y-6 flex-1 flex flex-col">
            <h2 className="text-xl font-bold text-white">Bước 1: Hiểu ý tưởng</h2>
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Phong cách</label>
                <select
                  value={style}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setStyle(event.target.value)}
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
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setIdea(event.target.value)}
                  className="flex-1 min-h-56 w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 resize-none"
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
          <div className="space-y-6 flex-1 flex flex-col overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 2: Phương án sáng tác</h2>
              <button onClick={() => setShowAdvanced(value => !value)} className="text-xs text-zinc-500 hover:text-zinc-300">
                {showAdvanced ? 'Ẩn nâng cao' : 'Chế độ nâng cao'}
              </button>
            </div>
            <div className="bg-black/30 border border-white/5 rounded-xl p-6">
              <h3 className="text-indigo-400 font-bold mb-3 uppercase text-xs tracking-widest">Tóm tắt phương án</h3>
              <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{planSummary}</p>
            </div>
            {showAdvanced && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Compose Prompt</label>
                    <textarea value={composePrompt} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComposePrompt(event.target.value)} className="w-full h-40 bg-black border border-white/10 rounded-lg p-3 text-xs font-mono text-zinc-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Arrange Prompt</label>
                    <textarea value={arrangePrompt} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setArrangePrompt(event.target.value)} className="w-full h-40 bg-black border border-white/10 rounded-lg p-3 text-xs font-mono text-zinc-400" />
                  </div>
                </div>
                <details className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-400">
                  <summary className="cursor-pointer font-bold uppercase tracking-wider">Meta Plan / Song Request / Knowledge refs</summary>
                  <pre className="mt-3 whitespace-pre-wrap overflow-auto">{metaPlan}</pre>
                  <pre className="mt-3 whitespace-pre-wrap overflow-auto">{JSON.stringify(songRequest, null, 2)}</pre>
                  <div className="mt-3">Compose: {composeDocRefs.join(', ')}</div>
                  <div>Arrange: {arrangeDocRefs.join(', ')}</div>
                </details>
              </div>
            )}
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button onClick={() => setStep(3)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold">
                Tiếp tục <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 flex-1 min-h-0 flex flex-col">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 3: Bản nhạc</h2>
              <button onClick={() => setShowAdvanced(value => !value)} className="text-xs text-zinc-500 hover:text-zinc-300">
                {showAdvanced ? 'Ẩn lệnh' : 'Xem lệnh sáng tác'}
              </button>
            </div>
            {showAdvanced && (
              <textarea value={composePrompt} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComposePrompt(event.target.value)} className="h-36 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-400" />
            )}
            {leadSheetXml ? (
              <ResultWorkspace xmlContent={leadSheetXml} title={idea || 'Lead Sheet'} subtitle="Lead Sheet — bản sáng tác gốc" filenameBase={`${idea || 'song'}_lead_sheet`} />
            ) : (
              <div className="flex-1 min-h-80 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black text-zinc-600">
                <Music className="w-16 h-16 mb-4 opacity-50" />
                <p>Bản nhạc sẽ hiển thị và phát được tại đây</p>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button onClick={handleGenerateLeadSheet} disabled={loading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl font-bold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {leadSheetXml ? 'Tạo lại bản nhạc' : 'Bắt đầu sáng tác'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 flex-1 min-h-0 flex flex-col overflow-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Bước 4: Phối khí & Sản phẩm</h2>
              <button onClick={() => setShowAdvanced(value => !value)} className="text-xs text-zinc-500 hover:text-zinc-300">
                {showAdvanced ? 'Ẩn lệnh' : 'Xem lệnh phối khí'}
              </button>
            </div>
            {showAdvanced && (
              <textarea value={arrangePrompt} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setArrangePrompt(event.target.value)} className="h-36 bg-black border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-400" />
            )}

            {finalXml ? (
              <ResultWorkspace
                xmlContent={finalXml}
                title={idea || 'Bản phối Music-Pro'}
                subtitle="Bản phối hoàn chỉnh — nghe / chỉnh tone-tempo / MIDI / WAV / MusicXML"
                filenameBase={`${idea || 'song'}_arrangement`}
                onChangeXml={(nextXml) => {
                  setFinalXml(nextXml);
                  setBlueprintData(null);
                  setAudioUrl(null);
                }}
              />
            ) : leadSheetXml ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Lead Sheet đã sẵn sàng. Anh/chị có thể nghe và xuất file ngay; bấm “Phối khí” để tạo bản phối đầy đủ.
                </div>
                <ResultWorkspace xmlContent={leadSheetXml} title={idea || 'Lead Sheet'} subtitle="Lead Sheet hiện tại" filenameBase={`${idea || 'song'}_lead_sheet`} />
              </div>
            ) : (
              <div className="min-h-80 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black text-zinc-600">
                <Music className="w-16 h-16 mb-4 opacity-50" />
                <p>Chưa có Lead Sheet để phối khí</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)} className="px-6 py-3 text-zinc-400 hover:text-white">Quay lại</button>
              <button onClick={handleGenerateArrangement} disabled={loading || !leadSheetXml} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {finalXml ? 'Tạo lại bản phối' : 'Phối khí'}
              </button>
            </div>

            {finalXml && (
              <div className="mt-4 pt-6 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-indigo-400" />
                  Studio Version — bản thu AI tùy chọn
                </h3>
                <p className="text-sm text-zinc-400 mb-5">
                  Score Preview/MIDI/WAV phía trên bám theo MusicXML. Bản thu AI ưu tiên chất lượng trình diễn và có thể khác một số chi tiết so với master score.
                </p>

                {!blueprintData ? (
                  <button onClick={handleGenerateBlueprint} disabled={generatingBlueprint} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 px-6 py-3 rounded-xl font-bold">
                    {generatingBlueprint ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Tạo thông tin bản thu
                  </button>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                      <InfoCard label="Phong cách" value={blueprintData.blueprint?.identity?.genre || style} />
                      <InfoCard label="BPM / Nhịp" value={`${blueprintData.blueprint?.musical?.tempo || '?'} / ${blueprintData.blueprint?.musical?.meter || '?'}`} />
                      <InfoCard label="Cấu trúc" value={(blueprintData.blueprint?.structure || []).map((section: any) => section.name).join(', ') || 'N/A'} />
                      <InfoCard label="Quãng giọng" value={blueprintData.blueprint?.musical?.vocalRange || 'N/A'} />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={handleCopyGeminiBrief} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-lg font-bold text-sm">
                        <Copy className="w-4 h-4" /> Sao chép Music Brief
                      </button>
                      <button
                        onClick={handleGenerateAudio}
                        disabled={generatingAudio || !capabilities?.lyriaEnabled}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm ${capabilities?.lyriaEnabled ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600/40 text-white/50 cursor-not-allowed'}`}
                      >
                        {generatingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
                        Tạo Studio MP3
                      </button>
                    </div>
                    {!capabilities?.lyriaEnabled && <p className="text-sm text-yellow-500 mt-3">Lyria đang tắt; Score Preview, MIDI và WAV vẫn hoạt động độc lập.</p>}
                    {audioUrl && (
                      <div className="mt-4 p-4 bg-black/40 rounded-xl border border-indigo-500/30 flex flex-col gap-4">
                        <h4 className="font-bold text-white flex items-center gap-2"><Play className="w-4 h-4 text-emerald-400" /> Studio Version đã sẵn sàng</h4>
                        <audio controls src={audioUrl} className="w-full" />
                        <a href={audioUrl} download={`${(idea || 'Composition').slice(0, 20).replace(/\s+/g, '_')}_AI_recording.mp3`} className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg font-bold text-sm">
                          <Download className="w-4 h-4" /> Tải MP3
                        </a>
                      </div>
                    )}
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

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-black/50 p-3 rounded-lg border border-white/5 min-w-0">
    <span className="text-xs text-zinc-500 block mb-1">{label}</span>
    <span className="text-sm font-bold block truncate" title={value}>{value}</span>
  </div>
);
