import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { AppSettings, UserProfile } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Người dùng',
  userRole: 'Composer',
  apiKey: '',
  model: 'gemini-3.1-pro-preview',
  temperature: 0.7,
};

export const dbService = {
  // --- Settings ---
  async getSettings(): Promise<AppSettings> {
    if (!auth.currentUser) return DEFAULT_SETTINGS;
    const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'config');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as AppSettings) : DEFAULT_SETTINGS;
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'config');
    await setDoc(docRef, settings, { merge: true });
  },

  // --- Profile ---
  async getUserProfile(): Promise<UserProfile | null> {
    if (!auth.currentUser) return null;
    const docRef = doc(db, 'users', auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(docRef, profile, { merge: true });
  }
};
