import React, { useEffect, useState } from 'react';
import { Archive, FileMusic, Loader2 } from 'lucide-react';
import { ResultWorkspace } from '../components/ResultWorkspace';
import { runsService, type CompositionRun } from '../services/runs';

export const RunsView: React.FC = () => {
  const [runs, setRuns] = useState<CompositionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<CompositionRun | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadRuns = async () => {
      setLoading(true);
      const loaded = await runsService.getAllRuns();
      if (cancelled) return;
      setRuns(loaded);
      setSelectedRun(current => current || loaded[0] || null);
      setLoading(false);
    };
    void loadRuns();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const selectedXml = selectedRun?.finalMusicXml || selectedRun?.musicXml || '';

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Lịch sử sáng tác</h1>
          <p className="text-zinc-400">Nghe lại, xem bản nhạc và xuất MusicXML / MIDI / WAV.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        <div className="w-full lg:w-[320px] bg-white/5 border border-white/10 rounded-2xl overflow-y-auto p-3 shrink-0">
          {runs.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10 px-4">Chưa có bản ghi nào. Hãy vào mục Sáng tác để tạo.</div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedRun?.id === run.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-black/50 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-white mb-1 line-clamp-2">{run.title || run.idea || 'Không tiêu đề'}</div>
                  <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/10 rounded-md text-white">{run.style}</span>
                    <span>{run.createdAt?.toDate ? new Date(run.createdAt.toDate()).toLocaleDateString() : 'Vừa xong'}</span>
                    {run.version && <span>v{run.version}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          {selectedRun && selectedXml ? (
            <div className="flex flex-col h-full min-h-0 p-4 gap-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedRun.title || selectedRun.idea}</h2>
                  <div className="text-sm text-zinc-400 mt-1 flex flex-wrap gap-4">
                    <span>Phong cách: <strong className="text-white">{selectedRun.style}</strong></span>
                    <span>Trạng thái: <strong className="text-emerald-400">{selectedRun.status}</strong></span>
                  </div>
                </div>
                <details className="text-xs text-zinc-500">
                  <summary className="cursor-pointer font-bold uppercase tracking-wider">Thông tin kỹ thuật</summary>
                  <div className="mt-2 max-w-xl rounded-lg bg-white/5 p-3 font-mono text-[10px] text-zinc-400 whitespace-pre-wrap">
                    {selectedRun.metaPrompt || 'Không có Meta Plan trong bản ghi này.'}
                  </div>
                </details>
              </div>

              <ResultWorkspace
                xmlContent={selectedXml}
                title={selectedRun.title || selectedRun.idea || 'Music-Pro composition'}
                subtitle="Bản phối đã lưu"
                filenameBase={selectedRun.title || selectedRun.idea || 'music-pro-song'}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <FileMusic className="w-16 h-16 mb-4 opacity-50" />
              <p>Chọn một bản ghi để nghe và xem chi tiết.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
