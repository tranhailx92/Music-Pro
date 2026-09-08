import React, { useEffect, useState } from 'react';
import { Archive, Play, FileMusic, Loader2, Download } from 'lucide-react';
import { runsService, type CompositionRun } from '../services/runs';
import { MusicXMLViewer } from '../components/MusicXMLViewer';

export const RunsView: React.FC = () => {
  const [runs, setRuns] = useState<CompositionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<CompositionRun | null>(null);

  useEffect(() => {
    const loadRuns = async () => {
      setLoading(true);
      const loaded = await runsService.getAllRuns();
      setRuns(loaded);
      setLoading(false);
    };
    loadRuns();
  }, []);

  const handleDownload = (xml: string, filename: string) => {
    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\s+/g, '_')}.musicxml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Lịch sử sáng tác</h1>
          <p className="text-zinc-400">Các bản nhạc và file MusicXML đã tạo</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        {/* List */}
        <div className="w-full md:w-1/3 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto flex flex-col p-4">
          {runs.length === 0 ? (
            <div className="text-center text-zinc-500 mt-10">Chưa có bản ghi nào. Hãy vào mục Sáng tác để tạo!</div>
          ) : (
            <div className="space-y-2">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedRun?.id === run.id ? 'bg-orange-500/10 border-orange-500/50' : 'bg-black/50 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="font-bold text-white mb-1 line-clamp-1">{run.idea || 'Không tiêu đề'}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/10 rounded-md text-white">{run.style}</span>
                    <span>{run.createdAt?.toDate ? new Date(run.createdAt.toDate()).toLocaleDateString() : 'Vừa xong'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="w-full md:w-2/3 bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          {selectedRun ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold">{selectedRun.idea}</h2>
                  {selectedRun.musicXml && (
                    <button 
                      onClick={() => handleDownload(selectedRun.musicXml, selectedRun.idea || 'song')}
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải MusicXML
                    </button>
                  )}
                </div>
                <div className="text-sm text-zinc-400 mb-4 flex gap-4">
                  <span>Phong cách: <strong className="text-white">{selectedRun.style}</strong></span>
                  <span>Trạng thái: <strong className="text-emerald-400">{selectedRun.status}</strong></span>
                </div>
                
                <details className="mb-2">
                  <summary className="text-xs font-bold text-zinc-500 cursor-pointer uppercase tracking-wider">Hiển thị các bộ lệnh</summary>
                  <div className="mt-2 space-y-4">
                    <div>
                      <div className="text-[10px] text-zinc-600 mb-1">Siêu lệnh (Meta Prompt)</div>
                      <div className="bg-white/5 p-3 rounded-lg text-xs font-mono text-zinc-300 max-h-32 overflow-auto">{selectedRun.metaPrompt}</div>
                    </div>
                  </div>
                </details>
              </div>
              
              <div className="flex-1 overflow-auto bg-[#050505] p-2">
                {selectedRun.musicXml ? (
                  <MusicXMLViewer xmlContent={selectedRun.musicXml} />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500">Không có dữ liệu MusicXML cho bản ghi này.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <FileMusic className="w-16 h-16 mb-4 opacity-50" />
              <p>Chọn một bản ghi để xem chi tiết và bản nhạc.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
