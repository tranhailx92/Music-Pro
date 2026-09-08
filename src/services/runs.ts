import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
export type { CompositionRun } from '../types';
import { CompositionRun } from '../types';

const COLLECTION_NAME = 'runs';

export const runsService = {
  async saveRun(runData: Omit<CompositionRun, 'id' | 'createdAt'>, id?: string): Promise<string> {
    if (!db) throw new Error("Firebase DB not initialized");
    
    const docRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    
    await setDoc(docRef, {
      ...runData,
      createdAt: serverTimestamp()
    }, { merge: true });

    return docRef.id;
  },

  async getAllRuns(): Promise<CompositionRun[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CompositionRun));
    } catch (e) {
      console.error("Error fetching runs", e);
      return [];
    }
  }
};
