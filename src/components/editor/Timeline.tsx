"use client";

import { useEditorStore } from "@/lib/stores";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type DragEvent,
  type MouseEvent,
} from "react";
import type { VideoClip, VideoTrack } from "@/types/project";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function trackLabel(type: VideoTrack["type"]): string {
  switch (type) {
    case "main":
      return "Principal";
    case "overlay":
      return "Overlay";
    case "audio":
      return "Áudio";
    case "caption":
      return "Legenda";
    default:
      return type;
  }
}

type DragMode = "move" | "trim-left" | "trim-right";

interface ContextMenu {
  x: number;
  y: number;
  clipId: string;
}

export function Timeline() {
  const {
    project,
    currentTime,
    zoom,
    selectedClipId,
    setCurrentTime,
    selectClip,
    updateClip,
  } = useEditorStore();

  const { splitClipAtTime, removeClip, addClipToTrack } = useVideoEditor();

  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [isDragOver, setIsDragOver] = useState<string | null>(null);

  const dragState = useRef<{
    mode: DragMode;
    clipId: string;
    trackId: string;
    startX: number;
    originalClip: VideoClip;
  } | null>(null);

  const pxPerSecond = 80 * zoom;

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Ruler / playhead click ───────────────────────────────────────────────

  const handleRulerClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!rulerRef.current || !project) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + (rulerRef.current.parentElement?.scrollLeft ?? 0);
      const time = x / pxPerSecond;
      setCurrentTime(Math.max(0, Math.min(time, project.duration)));
    },
    [project, pxPerSecond, setCurrentTime]
  );

  // ── Clip drag interactions ───────────────────────────────────────────────

  const startDrag = useCallback(
    (
      e: MouseEvent<HTMLDivElement>,
      mode: DragMode,
      clip: VideoClip,
      trackId: string
    ) => {
      e.stopPropagation();
      e.preventDefault();
      dragState.current = {
        mode,
        clipId: clip.id,
        trackId,
        startX: e.clientX,
        originalClip: { ...clip },
      };

      const onMouseMove = (me: globalThis.MouseEvent) => {
        if (!dragState.current) return;
        const dx = me.clientX - dragState.current.startX;
        const dt = dx / pxPerSecond;
        const orig = dragState.current.originalClip;

        if (dragState.current.mode === "move") {
          const newStart = Math.max(0, orig.start_time + dt);
          const dur = orig.end_time - orig.start_time;
          updateClip(dragState.current.clipId, (c) => ({
            ...c,
            start_time: newStart,
            end_time: newStart + dur,
          }));
        } else if (dragState.current.mode === "trim-left") {
          const newStart = Math.max(
            0,
            Math.min(orig.start_time + dt, orig.end_time - 0.1)
          );
          const trimDelta = newStart - orig.start_time;
          updateClip(dragState.current.clipId, (c) => ({
            ...c,
            start_time: newStart,
            trim_start: Math.max(0, orig.trim_start + trimDelta),
          }));
        } else if (dragState.current.mode === "trim-right") {
          const newEnd = Math.max(
            orig.start_time + 0.1,
            orig.end_time + dt
          );
          const trimDelta = newEnd - orig.end_time;
          updateClip(dragState.current.clipId, (c) => ({
            ...c,
            end_time: newEnd,
            trim_end: Math.min(
              orig.trim_end + trimDelta,
              orig.trim_end + (orig.trim_end - orig.trim_start)
            ),
          }));
        }
      };

      const onMouseUp = () => {
        dragState.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [pxPerSecond, updateClip]
  );

  // ── Context menu ─────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>, clipId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, clipId });
      selectClip(clipId);
    },
    [selectClip]
  );

  // ── File drop onto track ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, trackId: string) => {
    e.preventDefault();
    setIsDragOver(trackId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(null);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>, trackId: string) => {
      e.preventDefault();
      setIsDragOver(null);
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("video/")) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const startTime = Math.max(0, x / pxPerSecond);

      await addClipToTrack(trackId, file, startTime);
    },
    [pxPerSecond, addClipToTrack]
  );

  // ── Context menu actions ─────────────────────────────────────────────────

  const handleSplit = useCallback(() => {
    if (!contextMenu) return;
    splitClipAtTime(contextMenu.clipId, currentTime);
    setContextMenu(null);
  }, [contextMenu, splitClipAtTime, currentTime]);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    removeClip(contextMenu.clipId);
    setContextMenu(null);
  }, [contextMenu, removeClip]);

  const handleDuplicate = useCallback(() => {
    if (!contextMenu || !project) return;
    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === contextMenu.clipId);
      if (clip) {
        const dur = clip.end_time - clip.start_time;
        const newClip: VideoClip = {
          ...clip,
          id: Math.random().toString(36).slice(2, 10),
          start_time: clip.end_time,
          end_time: clip.end_time + dur,
        };
        useEditorStore.getState().addClipToTrack(track.id, newClip);
        useEditorStore.getState().registerClipBlob(newClip.id, clip.source_url);
        break;
      }
    }
    setContextMenu(null);
  }, [contextMenu, project]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!project) {
    return (
      <div className="flex items-center justify-center h-48 border-t border-zinc-800 bg-zinc-900/50 text-zinc-500 text-sm">
        Carregue um vídeo para começar
      </div>
    );
  }

  const totalWidth = project.duration * pxPerSecond;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 select-none">
      {/* Ruler */}
      <div className="flex overflow-x-auto overflow-y-hidden">
        <div className="w-24 flex-shrink-0" />
        <div
          ref={rulerRef}
          className="h-8 border-b border-zinc-800 flex items-end cursor-pointer relative flex-shrink-0"
          style={{ width: totalWidth }}
          onClick={handleRulerClick}
        >
          {Array.from({ length: Math.ceil(project.duration) + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute text-xs text-zinc-500 border-l border-zinc-700 pl-1 pb-1"
              style={{ left: i * pxPerSecond }}
            >
              {formatTime(i)}
            </div>
          ))}
        </div>
      </div>

      {/* Track rows */}
      <div
        ref={timelineRef}
        className="relative overflow-x-auto"
        style={{ minHeight: 160 }}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{ left: currentTime * pxPerSecond + 96 }}
        >
          <div className="w-0.5 h-full bg-green-500 relative">
            <div className="w-3 h-3 bg-green-500 rounded-full -translate-x-[5px] -translate-y-0" />
          </div>
        </div>

        {project.tracks.map((track) => (
          <div
            key={track.id}
            className={`h-16 border-b border-zinc-800/50 flex items-center relative transition-colors ${
              isDragOver === track.id ? "bg-green-900/20" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, track.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, track.id)}
          >
            {/* Track label */}
            <div className="w-24 flex-shrink-0 px-3 text-xs text-zinc-500 uppercase tracking-wider truncate">
              {trackLabel(track.type)}
            </div>

            {/* Clip area */}
            <div
              className="flex-1 relative h-full"
              style={{ minWidth: totalWidth }}
            >
              {track.clips.map((clip) => {
                const clipWidth = (clip.end_time - clip.start_time) * pxPerSecond;
                const clipLeft = clip.start_time * pxPerSecond;
                const isSelected = selectedClipId === clip.id;

                return (
                  <div
                    key={clip.id}
                    className={`absolute top-2 bottom-2 rounded-md overflow-hidden transition-shadow ${
                      isSelected
                        ? "ring-2 ring-green-400 bg-green-700/60"
                        : "bg-zinc-700/80 hover:bg-zinc-600/80"
                    }`}
                    style={{ left: clipLeft, width: Math.max(clipWidth, 8) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectClip(clip.id);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, clip.id)}
                    onMouseDown={(e) => startDrag(e, "move", clip, track.id)}
                  >
                    {/* Left trim handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize bg-green-500/40 hover:bg-green-500/80 z-10"
                      onMouseDown={(e) => startDrag(e, "trim-left", clip, track.id)}
                    />

                    {/* Clip label */}
                    <div className="px-3 py-1 text-xs truncate text-zinc-300 pointer-events-none">
                      {clip.source_url.split("/").pop()?.split("?")[0] ?? "clip"}
                    </div>

                    {/* Waveform placeholder for audio-type tracks */}
                    {track.type === "audio" && (
                      <div className="absolute bottom-1 left-2 right-2 h-4 flex items-center gap-px pointer-events-none">
                        {Array.from({ length: Math.max(1, Math.floor(clipWidth / 3)) }, (_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-green-400/50 rounded-sm"
                            style={{
                              height: `${20 + Math.sin(i * 0.8) * 50 + Math.cos(i * 1.3) * 30}%`,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Right trim handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize bg-green-500/40 hover:bg-green-500/80 z-10"
                      onMouseDown={(e) => startDrag(e, "trim-right", clip, track.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Drop hint when no tracks */}
        {project.tracks.every((t) => t.clips.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm pointer-events-none">
            Arraste vídeos aqui
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-sm text-left text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={handleSplit}
          >
            Dividir no tempo atual
          </button>
          <button
            className="w-full px-4 py-2 text-sm text-left text-zinc-300 hover:bg-zinc-700 transition-colors"
            onClick={handleDuplicate}
          >
            Duplicar
          </button>
          <div className="border-t border-zinc-700 my-1" />
          <button
            className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-zinc-700 transition-colors"
            onClick={handleDelete}
          >
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
