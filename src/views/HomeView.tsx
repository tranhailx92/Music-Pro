import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Archive, Settings, ArrowRight, Music, GitPullRequest } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { runsService } from '../services/runs';
import { knowledgeService } from '../services/knowledge';
import { settingsService } from '../services/settings';
import { motion } from 'motion/react';

export const HomeView: React.FC = () => {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState({ runs: 0, docs: 0 });
  const settings = settingsService.getSettings();

  useEffect(() => {
    const loadStats = async () => {
      const runs = await runsService.getAllRuns();
      const docs = await knowledgeService.getAllDocs();
      setStats({ runs: runs.length, docs: docs.length });
    };
    loadStats();
  }, []);

  const greeting = settings.userName ? `Chào quay trở lại, ${settings.userName}!` : 'Chào mừng bạn đến với ProjectMusic00!';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 md:px-8 py-8 md:py-12 max-w-6xl mx-auto h-full flex flex-col space-y-12"
    >
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
          {greeting}
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl">
          Hệ thống Workspace chuyên dụng cho việc sáng tác nhạc MusicXML, 
          quản lý tri thức và tự động nâng cấp kỹ năng phối khí bằng AI.
        </p>
      </div>

      {/* Stats & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:bg-white/[0.07] transition-all">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sáng tác</h2>
            <p className="text-zinc-500 text-sm mb-6">Bắt đầu quy trình 4 bước tạo bản nhạc MusicXML chất lượng cao.</p>
          </div>
          <button 
            onClick={() => navigate('compose')}
            className="flex items-center gap-2 text-indigo-400 font-bold group-hover:translate-x-2 transition-transform"
          >
            Bắt đầu ngay <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:bg-white/[0.07] transition-all">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Kho tri thức</h2>
            <p className="text-zinc-500 text-sm mb-6">Quản lý {stats.docs} tài liệu hướng dẫn và phong cách âm nhạc.</p>
          </div>
          <button 
            onClick={() => navigate('knowledge')}
            className="flex items-center gap-2 text-emerald-400 font-bold group-hover:translate-x-2 transition-transform"
          >
            Quản lý <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between group hover:bg-white/[0.07] transition-all">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6">
              <Archive className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Lịch sử</h2>
            <p className="text-zinc-500 text-sm mb-6">Xem lại {stats.runs} bản ghi sáng tác và phối khí trước đây.</p>
          </div>
          <button 
            onClick={() => navigate('runs')}
            className="flex items-center gap-2 text-orange-400 font-bold group-hover:translate-x-2 transition-transform"
          >
            Xem lịch sử <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Secondary Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-white/20 transition-all cursor-pointer" onClick={() => navigate('upgrade')}>
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <GitPullRequest className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Tác nhân Cải tiến (Improver)</h3>
            <p className="text-xs text-zinc-500">Phân tích lỗi phối khí và tự động cập nhật kho tri thức.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-700 group-hover:text-white transition-colors" />
        </div>

        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex items-center gap-6 group hover:border-white/20 transition-all cursor-pointer" onClick={() => navigate('settings')}>
          <div className="w-14 h-14 rounded-2xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Cấu hình hệ thống</h3>
            <p className="text-xs text-zinc-500">Cài đặt API Key, Model Gemini và thông tin cá nhân.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-zinc-700 group-hover:text-white transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};
