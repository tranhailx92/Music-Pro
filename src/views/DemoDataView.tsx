import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { knowledgeService } from '../services/knowledge';
import { runsService } from '../services/runs';
import { upgradesService } from '../services/upgrades';
import { useToast } from '../hooks/useToast';
import { motion } from 'motion/react';
import { settingsService } from '../services/settings';

const DEMO_XML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Demo Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

export const DemoDataView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSeed = async () => {
    setLoading(true);
    try {
      // 1. Seed a Demo Run (Testing Composition Workflow)
      const runId = await runsService.saveRun({
        idea: 'Bản ballad V-Pop nhẹ nhàng (Workflow Test)',
        style: 'V-Pop Ballad',
        metaPrompt: 'Tạo một bản nhạc ballad phong cách Việt Nam hiện đại.',
        composePrompt: 'Tạo lead sheet cho bài hát ballad.',
        arrangePrompt: 'Phối khí với Piano và Strings.',
        musicXml: DEMO_XML,
        status: 'completed'
      });

      addToast('Đã khởi tạo quy trình sáng tác demo thành công!');
    } catch (err) {
      console.error(err);
      addToast('Lỗi khi khởi tạo dữ liệu demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-8 py-12 max-w-2xl mx-auto text-center space-y-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto"
      >
        <Database className="w-10 h-10" />
      </motion.div>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Kiểm tra Luồng sáng tác</h1>
        <p className="text-zinc-400">
          Nhấn nút bên dưới để tự động tạo một bản ghi sáng tác mẫu (Workflow Test). 
          Điều này giúp bạn kiểm tra nhanh khả năng hiển thị MusicXML và quy trình 
          lưu trữ lịch sử sáng tác mà không ảnh hưởng đến các cài đặt hệ thống khác.
        </p>
      </div>

      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-500/10"
      >
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
        Khởi tạo Luồng sáng tác Demo
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-sm">
            <h4 className="font-bold text-white">Kiểm tra Firebase</h4>
            <p className="text-zinc-500">Xác thực kết nối và quyền ghi vào Firestore.</p>
          </div>
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-sm">
            <h4 className="font-bold text-white">Kiểm tra MusicXML</h4>
            <p className="text-zinc-500">Xác thực khả năng hiển thị của bộ lọc OSMD.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
