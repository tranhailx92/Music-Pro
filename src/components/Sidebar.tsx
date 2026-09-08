import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Archive, GitPullRequest, Settings, Home, Database, ChevronLeft, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigation } from '../hooks/useNavigation';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentView, navigate } = useNavigation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(false); // Mobile sidebar is full width when open
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleNavigate = (view: string) => {
    navigate(view as any);
    if (isMobile && onClose) onClose();
  };

  const sidebarContent = (
    <motion.div 
      initial={isMobile ? { x: -300 } : false}
      animate={{ x: 0, width: isCollapsed ? 80 : 280 }}
      exit={isMobile ? { x: -300 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-r border-white/5 z-[60] relative shrink-0 overflow-hidden",
        isMobile && "fixed inset-y-0 left-0 shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        "p-6 flex items-center justify-between text-white overflow-hidden whitespace-nowrap min-h-[5rem]",
        isCollapsed && "justify-center px-0"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-black text-xl tracking-tighter"
              >
                MusicPro
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {isMobile && (
          <button 
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Section */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <SidebarLink 
          icon={<Home className="w-5 h-5" />} 
          label="Tổng quan" 
          active={currentView === 'home'} 
          onClick={() => handleNavigate('home')} 
          isCollapsed={isCollapsed}
        />
        <SidebarLink 
          icon={<Sparkles className="w-5 h-5" />} 
          label="Sáng tác AI" 
          active={currentView === 'compose'} 
          onClick={() => handleNavigate('compose')} 
          isCollapsed={isCollapsed}
        />
        <SidebarLink 
          icon={<BookOpen className="w-5 h-5" />} 
          label="Kho kiến thức" 
          active={currentView === 'knowledge'} 
          onClick={() => handleNavigate('knowledge')} 
          isCollapsed={isCollapsed}
        />
        <SidebarLink 
          icon={<Archive className="w-5 h-5" />} 
          label="Lịch sử" 
          active={currentView === 'runs'} 
          onClick={() => handleNavigate('runs')} 
          isCollapsed={isCollapsed}
        />
        <SidebarLink 
          icon={<GitPullRequest className="w-5 h-5" />} 
          label="Nâng cấp" 
          active={currentView === 'upgrade'} 
          onClick={() => handleNavigate('upgrade')} 
          isCollapsed={isCollapsed}
        />
        <div className="pt-4 pb-2 px-4">
          <div className="h-px bg-white/5 w-full" />
        </div>
        <SidebarLink 
          icon={<Database className="w-5 h-5" />} 
          label="Dữ liệu mẫu" 
          active={currentView === 'demo'} 
          onClick={() => handleNavigate('demo')} 
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Footer Section */}
      <div className="p-3 border-t border-white/5 space-y-2 bg-zinc-950/50 backdrop-blur-sm">
        <SidebarLink 
          icon={<Settings className="w-5 h-5" />} 
          label="Cài đặt" 
          active={currentView === 'settings'} 
          onClick={() => handleNavigate('settings')} 
          isCollapsed={isCollapsed}
        />
        
        {!isMobile && (
          <button 
            onClick={toggleSidebar}
            className={cn(
              "flex items-center gap-4 px-3 py-3 w-full rounded-xl transition-all font-bold text-zinc-500 hover:text-white hover:bg-white/5",
              isCollapsed && "justify-center"
            )}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!isCollapsed && <span className="text-sm">Thu gọn</span>}
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[55]"
          />
        )}
      </AnimatePresence>
      
      {!isMobile ? sidebarContent : (
        <AnimatePresence>
          {isOpen && sidebarContent}
        </AnimatePresence>
      )}
    </>
  );
};

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isCollapsed: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon, label, active, onClick, isCollapsed }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 px-3 py-3 w-full rounded-xl transition-all font-bold text-sm relative group min-h-[44px]",
      active 
        ? "bg-white/10 text-white shadow-sm" 
        : "text-zinc-500 hover:text-white hover:bg-white/5",
      isCollapsed && "justify-center px-0"
    )}
  >
    <div className={cn(
      "shrink-0 transition-transform duration-300",
      active && "scale-110",
      !active && "group-hover:scale-110"
    )}>
      {icon}
    </div>
    
    {!isCollapsed && (
      <motion.span 
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className="whitespace-nowrap overflow-hidden"
      >
        {label}
      </motion.span>
    )}

    {isCollapsed && (
      <div className="absolute left-full ml-4 px-3 py-2 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-white/10 shadow-xl">
        {label}
      </div>
    )}
    
    {active && (
      <motion.div 
        layoutId="sidebar-active"
        className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
      />
    )}
  </button>
);
