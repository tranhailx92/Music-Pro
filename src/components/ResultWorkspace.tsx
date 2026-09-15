import React, { useState } from 'react';
import { FileMusic } from 'lucide-react';
import { MusicXMLViewer } from './MusicXMLViewer';
import { ScorePlayer } from './ScorePlayer';
import { ScoreQuickEdit } from './ScoreQuickEdit';

interface ResultWorkspaceProps {
  xmlContent: string;
  title: string;
  subtitle?: string;
  filenameBase?: string;
  className?: string;
  onChangeXml?: (nextXml: string) => void;
}

export const ResultWorkspace: React.FC<ResultWorkspaceProps> = ({
  xmlContent,
  title,
  subtitle,
  filenameBase,
  className = '',
  onChangeXml,
}) => {
  const [currentMeasure, setCurrentMeasure] = useState<number | undefined>(undefined);

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
        <FileMusic className="h-4 w-4" />
        <span>{subtitle || 'Bản nhạc Music-Pro'}</span>
      </div>
      {onChangeXml && <ScoreQuickEdit xmlContent={xmlContent} onChange={onChangeXml} />}
      <ScorePlayer
        xmlContent={xmlContent}
        title={title}
        filenameBase={filenameBase}
        onCurrentMeasureChange={setCurrentMeasure}
      />
      <div className="min-h-[360px] flex-1 overflow-auto rounded-xl border border-white/10 bg-black">
        <MusicXMLViewer xmlContent={xmlContent} currentMeasure={currentMeasure} />
      </div>
    </div>
  );
};
