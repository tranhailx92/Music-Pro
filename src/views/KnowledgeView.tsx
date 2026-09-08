import React, { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, FileText, Plus, Save, X, Loader2 } from 'lucide-react';
import { knowledgeService, type KnowledgeDoc } from '../services/knowledge';
import { useToast } from '../hooks/useToast';

export const KnowledgeView: React.FC = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeDoc> | null>(null);
  const { addToast } = useToast();

  const loadDocs = async () => {
    setLoading(true);
    await knowledgeService.seedInitialDocsIfEmpty();
    const loadedDocs = await knowledgeService.getAllDocs();
    setDocs(loadedDocs);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleSave = async () => {
    if (!editingDoc?.id || !editingDoc?.title) return;
    
    try {
      await knowledgeService.saveDoc({
        id: editingDoc.id,
        title: editingDoc.title,
        category: editingDoc.category || 'misc',
        content: editingDoc.content || '',
      });
      addToast('Đã lưu tài liệu thành công');
      setEditingDoc(null);
      loadDocs();
    } catch (e) {
      console.error(e);
      addToast('Lưu tài liệu thất bại');
    }
  };

  const groupedDocs = docs.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, KnowledgeDoc[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Kho kiến thức</h1>
            <p className="text-zinc-400">Hệ thống quy tắc & phong cách (docs/m-guide/)</p>
          </div>
        </div>
        <button 
          onClick={() => setEditingDoc({ id: '', title: '', category: 'knowledge', content: '' })}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm mới
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        <div className="w-full md:w-1/3 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto flex flex-col">
          {(Object.entries(groupedDocs) as [string, KnowledgeDoc[]][]).map(([category, catDocs]) => (
            <div key={category} className="mb-4">
              <div className="px-4 py-3 bg-white/5 text-xs font-bold uppercase tracking-wider text-zinc-500 sticky top-0 backdrop-blur-md">
                {category}
              </div>
              <div>
                {catDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setEditingDoc(doc)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <FileText className="w-5 h-5 text-emerald-500/70" />
                    <div className="truncate">
                      <div className="font-medium text-sm truncate text-white">{doc.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{doc.id}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full md:w-2/3 bg-black border border-white/10 rounded-2xl flex flex-col min-h-[500px]">
          {editingDoc ? (
            <div className="flex flex-col h-full p-4 md:p-6 gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-emerald-400">
                  {editingDoc.updatedAt ? 'Chỉnh sửa tài liệu' : 'Tài liệu mới'}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setEditingDoc(null)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
                    <X className="w-5 h-5" />
                  </button>
                  <button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="ID tài liệu (vd: for-ai)" 
                  value={editingDoc.id}
                  disabled={!!editingDoc.updatedAt}
                  onChange={(e) => setEditingDoc(prev => ({...prev!, id: e.target.value}))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <input 
                  type="text" 
                  placeholder="Danh mục (vd: core)" 
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc(prev => ({...prev!, category: e.target.value}))}
                  className="w-1/3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <input 
                  type="text" 
                  placeholder="Tiêu đề tài liệu" 
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc(prev => ({...prev!, title: e.target.value}))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500"
                />
              
              <textarea 
                placeholder="Nội dung Markdown..."
                value={editingDoc.content}
                onChange={(e) => setEditingDoc(prev => ({...prev!, content: e.target.value}))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
              <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
              <p>Chọn một tài liệu để chỉnh sửa hoặc tạo mới.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
