import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Cpu, User, Sliders } from 'lucide-react';
import { dbService } from '../services/db';
import { AppSettings } from '../types';
import { useToast } from '../hooks/useToast';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    dbService.getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    if (settings) {
      await dbService.saveSettings(settings);
      addToast('Đã lưu cài đặt thành công trên đám mây');
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  if (!settings) return <div className="p-8 text-center text-zinc-500">Đang tải cài đặt...</div>;

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-500/20 text-zinc-400 flex items-center justify-center">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cài đặt</h1>
            <p className="text-zinc-400">Cấu hình thông tin cá nhân và hệ thống AI</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-colors"
        >
          <Save className="w-4 h-4" />
          Lưu cài đặt
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <User className="w-5 h-5 text-indigo-400" />
            <h2>Thông tin cơ bản</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Tên người dùng</label>
              <input 
                type="text" 
                value={settings.userName}
                onChange={(e) => updateSetting('userName', e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Vai trò</label>
              <input 
                type="text" 
                value={settings.userRole}
                onChange={(e) => updateSetting('userRole', e.target.value)}
                placeholder="Nhập vai trò (vd: Composer, Arranger)..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 text-white font-bold">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2>Cấu hình AI</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Gemini API Key (Tùy chọn)</label>
              <input 
                type="password" 
                value={settings.apiKey}
                onChange={(e) => updateSetting('apiKey', e.target.value)}
                placeholder="Để trống để dùng API Key mặc định của hệ thống..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <p className="mt-2 text-xs text-zinc-500 italic">Lưu ý: API Key của bạn được lưu an toàn trên đám mây.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Mô hình (Model)
                </label>
                <select 
                  value={settings.model}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Preview)</option>
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Latest)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Độ sáng tạo (Temperature): {settings.temperature}
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mt-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
