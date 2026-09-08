import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { NavigationProvider, useNavigation } from './hooks/useNavigation';
import { ToastProvider } from './hooks/useToast';
import { AudioProvider } from './contexts/AudioContext';
import { NowPlayingBar } from './components/NowPlayingBar';

import { HomeView } from './views/HomeView';
import { ComposeView } from './views/ComposeView';
import { KnowledgeView } from './views/KnowledgeView';
import { RunsView } from './views/RunsView';
import { UpgradeView } from './views/UpgradeView';
import { SettingsView } from './views/SettingsView';
import { DemoDataView } from './views/DemoDataView';
import { FirebaseErrorView } from './views/FirebaseErrorView';

import { db } from './lib/firebase';

const MainContent = () => {
  const { currentView } = useNavigation();
  const needsFirebase = ['compose', 'knowledge', 'runs', 'upgrade', 'demo'].includes(currentView);

  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-full">
      {needsFirebase && !db ? (
        <FirebaseErrorView />
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {currentView === 'home' && <HomeView />}
          {currentView === 'compose' && <ComposeView />}
          {currentView === 'knowledge' && <KnowledgeView />}
          {currentView === 'runs' && <RunsView />}
          {currentView === 'upgrade' && <UpgradeView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'demo' && <DemoDataView />}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <AudioProvider>
        <NavigationProvider>
          <div className="flex flex-col h-[100dvh] bg-[#050505] text-white selection:bg-indigo-500/30 overflow-hidden">
            <div className="flex flex-1 overflow-hidden relative">
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <NowPlayingBar onMenuClick={() => setIsSidebarOpen(true)} />
                <MainContent />
              </div>
            </div>
          </div>
        </NavigationProvider>
      </AudioProvider>
    </ToastProvider>
  );
}
