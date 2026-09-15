export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: number;
}

export interface CompositionRun {
  id: string;
  idea: string;
  style: string;
  metaPrompt: string;
  composePrompt: string;
  arrangePrompt: string;
  /** Backward-compatible final score field used by existing records. */
  musicXml: string;
  /** Optional original Step-3 master score for future revisions. */
  leadMusicXml?: string;
  /** Optional explicit Step-4 final score; falls back to musicXml for older records. */
  finalMusicXml?: string;
  title?: string;
  durationSeconds?: number;
  version?: number;
  parentRevisionId?: string;
  status: 'draft' | 'completed' | 'failed';
  createdAt: any;
}

export interface UpgradeSuggestion {
  id: string;
  runId: string;
  critique: string;
  suggestion: string;
  targetDocId: string;
  title: string;
  category: string;
  newContent: string;
  status: 'pending' | 'merged' | 'rejected';
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastSynced: number;
}

export interface AppSettings {
  userName: string;
  userRole: string;
  temperature: number;
}
