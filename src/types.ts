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
  musicXml: string;
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
