"use client";

import { useEditorStore } from "@/lib/stores";
import { useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { VideoClip } from "@/types/project";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface OverlayVideoProps {
  clip: VideoClip;
  currentTime: number;
  isPlaying: boolean;
  containerWidth: number;
  containerHeight: number;
}

function OverlayVideo({
  clip,
  currentTime,
  isPlaying,
  containerWidth,
  containerHeight,
}: OverlayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isActive =
    currentTime >= clip.start_time && currentTime <= clip.end_time;

  // Sync overlay video time
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const clipLocalTime = Math.max(
      0,
      currentTime - clip.start_time + clip.trim_start
    );
    if (Math.abs(el.currentTime - clipLocalTime) > 0.3) {
      el.currentTime = clipLocalTime;
    }
  }, [currentTime, clip.start_time, clip.trim_start]);

  // Sync play/pause for overlay
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && isPlaying) {
      el.play().catch(() => null);
    } else {
      el.pause();
    }
  }, [isPlaying, isActive]);

  if (!isActive) return null;

  const px = clip.position?.x ?? 10;
  const py = clip.position?.y ?? 10;
  const pw = clip.size?.width ?? 320;
  const ph = clip.size?.height ?? 180;

  // Scale position relative to container
  const scaleX = containerWidth / 1920;
  const scaleY = containerHeight / 1080;

  return (
    <video
      ref={videoRef}
      src={clip.source_url}
      className="absolute rounded shadow-lg"
      style={{
        left: px * scaleX,
        top: py * scaleY,
        width: pw * scaleX,
        height: ph * scaleY,
        opacity: clip.opacity ?? 1,
      }}
      muted
      playsInline
    />
  );
}

export function VideoPreview() {
  const {
    project,
    currentTime,
    isPlaying,
    clipBlobMap,
    setPlaying,
    setCurrentTime,
  } = useEditorStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);

  // Get the main clip currently at currentTime
  const mainTrack = project?.tracks.find((t) => t.type === "main");
  const activeMainClip = mainTrack?.clips.find(
    (c) => currentTime >= c.start_time && currentTime <= c.end_time
  );
  const overlayTrack = project?.tracks.find((t) => t.type === "overlay");

  // Resolve blob URL for main clip
  const mainSrc = activeMainClip
    ? clipBlobMap[activeMainClip.id] ?? activeMainClip.source_url
    : null;

  // Sync main video time with store
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeMainClip || isSeeking.current) return;
    const clipLocalTime =
      currentTime - activeMainClip.start_time + activeMainClip.trim_start;
    if (Math.abs(el.currentTime - clipLocalTime) > 0.3) {
      el.currentTime = Math.max(0, clipLocalTime);
    }
  }, [currentTime, activeMainClip]);

  // Sync play/pause with store
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying && activeMainClip) {
      el.play().catch(() => null);
    } else {
      el.pause();
    }
  }, [isPlaying, activeMainClip]);

  // Update store time as video plays
  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !activeMainClip || isSeeking.current) return;
    const storeTime =
      el.currentTime - activeMainClip.trim_start + activeMainClip.start_time;
    setCurrentTime(Math.max(0, storeTime));
  }, [activeMainClip, setCurrentTime]);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
  }, [setPlaying]);

  const containerWidth = containerRef.current?.clientWidth ?? 640;
  const containerHeight = containerRef.current?.clientHeight ?? 360;

  const previewWidth = project
    ? Math.min(project.width, containerWidth)
    : 640;
  const previewHeight = project
    ? Math.round(previewWidth * (project.height / project.width))
    : 360;

  return (
    <div className="flex flex-col flex-1">
      {/* Preview area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden min-h-[300px]"
      >
        {mainSrc ? (
          <div
            className="relative bg-black"
            style={{ width: previewWidth, height: previewHeight }}
          >
            <video
              ref={videoRef}
              key={mainSrc}
              src={mainSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onSeeking={() => { isSeeking.current = true; }}
              onSeeked={() => { isSeeking.current = false; }}
              muted={false}
              playsInline
            />

            {/* Overlay clips */}
            {overlayTrack?.clips.map((clip) => (
              <OverlayVideo
                key={clip.id}
                clip={clip}
                currentTime={currentTime}
                isPlaying={isPlaying}
                containerWidth={previewWidth}
                containerHeight={previewHeight}
              />
            ))}

            {/* Caption overlay */}
            {project?.captions
              ?.filter(
                (c) =>
                  currentTime >= c.start_time && currentTime <= c.end_time
              )
              .map((cap) => (
                <div
                  key={cap.id}
                  className={`absolute left-0 right-0 px-4 text-center pointer-events-none ${
                    cap.style.position === "top"
                      ? "top-4"
                      : cap.style.position === "center"
                      ? "top-1/2 -translate-y-1/2"
                      : "bottom-4"
                  }`}
                >
                  <span
                    className="px-2 py-1 rounded"
                    style={{
                      fontFamily: cap.style.fontFamily,
                      fontSize: cap.style.fontSize,
                      color: cap.style.color,
                      backgroundColor:
                        cap.style.backgroundColor ?? "rgba(0,0,0,0.6)",
                    }}
                  >
                    {cap.text}
                  </span>
                </div>
              ))}
          </div>
        ) : project ? (
          <div
            className="bg-zinc-900 flex items-center justify-center text-zinc-600 rounded"
            style={{ width: previewWidth, height: previewHeight }}
          >
            {project.width}x{project.height}
          </div>
        ) : (
          <div className="text-zinc-600 text-center space-y-2">
            <Play className="w-12 h-12 mx-auto" />
            <p>Nenhum vídeo carregado</p>
            <p className="text-xs text-zinc-700">
              Clique em &quot;Importar&quot; na barra de ferramentas
            </p>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4 py-3 border-t border-zinc-800">
        <button
          className="text-zinc-400 hover:text-white transition-colors"
          onClick={() => {
            setCurrentTime(Math.max(0, currentTime - 5));
          }}
          title="Voltar 5 segundos"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-700 transition-colors disabled:opacity-40"
          onClick={() => setPlaying(!isPlaying)}
          disabled={!project}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        <button
          className="text-zinc-400 hover:text-white transition-colors"
          onClick={() =>
            setCurrentTime(Math.min(project?.duration ?? 0, currentTime + 5))
          }
          title="Avançar 5 segundos"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="ml-4 text-sm text-zinc-400 font-mono">
          {formatTime(currentTime)} / {formatTime(project?.duration ?? 0)}
        </div>

        <Volume2 className="w-4 h-4 text-zinc-500 ml-4" />
      </div>
    </div>
  );
}
