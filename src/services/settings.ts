import { AppSettings } from '../types';

const SETTINGS_KEY = 'music_pro_settings';

const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  userRole: 'Composer',
  apiKey: '',
  model: 'gemini-3.1-pro-preview',
  temperature: 0.7,
};

export const settingsService = {
  getSettings(): AppSettings {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
