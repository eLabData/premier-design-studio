"use client";

import { useEditorStore } from "@/lib/stores";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

export function VideoPreview() {
  const { project, currentTime, isPlaying, setPlaying, setCurrentTime } =
    useEditorStore();

  return (
    <div className="flex flex-col flex-1">
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden min-h-[300px]">
        {project ? (
          <div
            className="bg-zinc-900 flex items-center justify-center text-zinc-600"
            style={{
              width: Math.min(project.width, 640),
              height: Math.min(project.height, 360),
              aspectRatio: `${project.width}/${project.height}`,
            }}
          >
            Preview {project.width}x{project.height}
          </div>
        ) : (
          <div className="text-zinc-600 text-center space-y-2">
            <Play className="w-12 h-12 mx-auto" />
            <p>Nenhum video carregado</p>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4 py-3 border-t border-zinc-800">
        <button
          className="text-zinc-400 hover:text-white transition-colors"
          onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white hover:bg-green-700 transition-colors"
          onClick={() => setPlaying(!isPlaying)}
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
            setCurrentTime(
              Math.min(project?.duration ?? 0, currentTime + 5)
            )
          }
        >
          <SkipForward className="w-5 h-5" />
        </button>
        <div className="ml-4 text-sm text-zinc-400 font-mono">
          {formatTime(currentTime)} /{" "}
          {formatTime(project?.duration ?? 0)}
        </div>
        <Volume2 className="w-4 h-4 text-zinc-500 ml-4" />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
