import React, { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicXMLViewerProps {
  xmlContent: string;
}

export const MusicXMLViewer: React.FC<MusicXMLViewerProps> = ({ xmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        darkMode: true, // Matching our dark theme!
        pageBackgroundColor: "#050505"
      });
    }

    if (xmlContent) {
      let content = xmlContent.trim();
      if (!content.startsWith('<?xml')) {
        content = `<?xml version="1.0" encoding="UTF-8"?>\n${content}`;
      }
      osmdRef.current.load(content).then(() => {
        osmdRef.current?.render();
      }).catch(err => {
        console.error("OSMD Load Error:", err);
      });
    }

    return () => {
      // Cleanup if needed, though OSMD doesn't have a strict destroy method
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      osmdRef.current = null;
    };
  }, [xmlContent]);

  return (
    <div className="w-full bg-[#050505] rounded-xl overflow-hidden min-h-[400px]">
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
