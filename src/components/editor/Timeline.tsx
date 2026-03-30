"use client";

import { useEditorStore } from "@/lib/stores";
import { useCallback, useRef } from "react";

export function Timeline() {
  const {
    project,
    currentTime,
    zoom,
    selectedClipId,
    setCurrentTime,
    selectClip,
  } = useEditorStore();
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || !project) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * project.duration;
      setCurrentTime(Math.max(0, Math.min(time, project.duration)));
    },
    [project, setCurrentTime]
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center h-48 border-t border-zinc-800 bg-zinc-900/50 text-zinc-500">
        Carregue um video para comecar
      </div>
    );
  }

  const pxPerSecond = 80 * zoom;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50">
      {/* Time ruler */}
      <div className="h-8 border-b border-zinc-800 flex items-end px-2 overflow-hidden">
        {Array.from({ length: Math.ceil(project.duration) }, (_, i) => (
          <div
            key={i}
            className="flex-shrink-0 text-xs text-zinc-500 border-l border-zinc-700 pl-1"
            style={{ width: pxPerSecond }}
          >
            {formatTime(i)}
          </div>
        ))}
      </div>

      {/* Tracks */}
      <div
        ref={timelineRef}
        className="relative min-h-[160px] overflow-x-auto cursor-crosshair"
        onClick={handleTimelineClick}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-20 pointer-events-none"
          style={{ left: currentTime * pxPerSecond }}
        >
          <div className="w-3 h-3 bg-green-500 rounded-full -translate-x-[5px] -translate-y-1" />
        </div>

        {/* Track rows */}
        {project.tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            className="h-16 border-b border-zinc-800/50 flex items-center relative"
          >
            {/* Track label */}
            <div className="w-24 flex-shrink-0 px-3 text-xs text-zinc-500 uppercase tracking-wider">
              {track.type}
            </div>

            {/* Clips */}
            <div className="flex-1 relative h-full">
              {track.clips.map((clip) => (
                <div
                  key={clip.id}
                  className={`absolute top-2 bottom-2 rounded-md cursor-pointer transition-colors ${
                    selectedClipId === clip.id
                      ? "bg-green-600/60 ring-2 ring-green-400"
                      : "bg-zinc-700/80 hover:bg-zinc-600/80"
                  }`}
                  style={{
                    left: clip.start_time * pxPerSecond,
                    width: (clip.end_time - clip.start_time) * pxPerSecond,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectClip(clip.id);
                  }}
                >
                  <div className="px-2 py-1 text-xs truncate text-zinc-300">
                    {clip.source_url.split("/").pop()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
