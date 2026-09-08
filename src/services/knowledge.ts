import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
export type { KnowledgeDoc } from '../types';
import { KnowledgeDoc } from '../types';

const COLLECTION_NAME = 'knowledge_docs';

export const knowledgeService = {
  async getAllDocs(): Promise<KnowledgeDoc[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('category'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeDoc));
    } catch (e) {
      console.error("Error fetching docs", e);
      return [];
    }
  },

  async getDocById(id: string): Promise<KnowledgeDoc | null> {
    if (!db) return null;
    const docRef = doc(db, COLLECTION_NAME, id.replace(/\//g, '_'));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as KnowledgeDoc;
    }
    return null;
  },

  async saveDoc(docData: Omit<KnowledgeDoc, 'updatedAt'>): Promise<void> {
    if (!db) return;
    const safeId = docData.id.replace(/\//g, '_');
    const docRef = doc(db, COLLECTION_NAME, safeId);
    await setDoc(docRef, {
      ...docData,
      id: docData.id,
      updatedAt: Date.now()
    }, { merge: true });
  },

  async deleteDoc(id: string): Promise<void> {
    if (!db) return;
    const safeId = id.replace(/\//g, '_');
    const docRef = doc(db, COLLECTION_NAME, safeId);
    await deleteDoc(docRef);
  },
  
  async seedInitialDocsIfEmpty(): Promise<void> {
    const docs = await this.getAllDocs();
    if (docs.length === 0) {
      await this.saveDoc({
        id: 'for-ai',
        title: 'For AI - System Instructions',
        category: 'core',
        content: '# Core Directives\n1. You are a professional Vietnamese music composer AI.\n2. Always output valid MusicXML 4.0.'
      });
      await this.saveDoc({
        id: 'catalog',
        title: 'Catalog Index',
        category: 'core',
        content: 'knowledge/melody: Principles of Vietnamese melody\nknowledge/styles: V-Pop, Bolero'
      });
      await this.saveDoc({
        id: 'knowledge_styles',
        title: 'Music Styles',
        category: 'knowledge',
        content: '# V-Pop Ballad\nTempo: 70-85 BPM.\nInstruments: Piano, Acoustic Guitar, Strings.'
      });
    }
  }
};
