import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicXMLViewerProps {
  xmlContent: string;
  currentMeasure?: number;
}

function getCursorMeasureNumber(cursor: any): number | undefined {
  const iterator = cursor?.iterator || cursor?.Iterator;
  const currentMeasure = iterator?.currentMeasure || iterator?.CurrentMeasure;
  const raw = currentMeasure?.MeasureNumber ?? currentMeasure?.measureNumber;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export const MusicXMLViewer: React.FC<MusicXMLViewerProps> = ({ xmlContent, currentMeasure }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const lastCursorMeasureRef = useRef<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderEpoch, setRenderEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current) return;

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        darkMode: true,
        pageBackgroundColor: '#050505',
      });
    }

    if (!xmlContent) return;
    setLoading(true);
    setError(null);
    let content = xmlContent.trim();
    if (!content.startsWith('<?xml')) {
      content = `<?xml version="1.0" encoding="UTF-8"?>\n${content}`;
    }

    osmdRef.current
      .load(content)
      .then(() => {
        if (cancelled) return;
        osmdRef.current?.render();
        const cursor = (osmdRef.current as any)?.cursor;
        try {
          cursor?.reset?.();
          cursor?.hide?.();
        } catch {
          // Cursor support is best-effort; score rendering remains usable without it.
        }
        lastCursorMeasureRef.current = undefined;
        setRenderEpoch(value => value + 1);
      })
      .catch((cause: any) => {
        if (cancelled) return;
        console.error('OSMD Load Error:', cause);
        setError(cause?.message || 'Không thể hiển thị bản nhạc MusicXML.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [xmlContent]);

  useEffect(() => {
    const osmd: any = osmdRef.current;
    const cursor = osmd?.cursor;
    if (!cursor) return;

    try {
      if (currentMeasure === undefined) {
        cursor.hide?.();
        lastCursorMeasureRef.current = undefined;
        return;
      }

      const last = lastCursorMeasureRef.current;
      if (last === undefined || currentMeasure < last) cursor.reset?.();
      cursor.show?.();
      if ('FollowCursor' in osmd) osmd.FollowCursor = true;

      let cursorMeasure = getCursorMeasureNumber(cursor);
      let safety = 0;
      while (cursorMeasure !== undefined && cursorMeasure < currentMeasure && safety < 10000) {
        cursor.next?.();
        const nextMeasure = getCursorMeasureNumber(cursor);
        if (nextMeasure === cursorMeasure && safety > 0) break;
        cursorMeasure = nextMeasure;
        safety += 1;
      }
      lastCursorMeasureRef.current = currentMeasure;
    } catch (cause) {
      // Do not let cursor synchronization break score viewing or playback.
      console.warn('OSMD cursor sync unavailable:', cause);
    }
  }, [currentMeasure, renderEpoch]);

  useEffect(() => {
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
      osmdRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full min-h-[400px] overflow-hidden rounded-xl bg-[#050505]">
      {loading && (
        <div className="absolute right-3 top-3 z-10 rounded-md bg-black/70 px-2 py-1 text-[11px] text-zinc-400">
          Đang dựng bản nhạc…
        </div>
      )}
      {error && (
        <div className="m-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
