"use client";

import { VideoPreview } from "@/components/editor/VideoPreview";
import { Timeline } from "@/components/editor/Timeline";
import { Toolbar } from "@/components/editor/Toolbar";
import { CaptionEditor } from "@/components/editor/CaptionEditor";
import { ClipProperties } from "@/components/editor/ClipProperties";
import { AutoEditPanel } from "@/components/editor/AutoEditPanel";
import { useEditorStore } from "@/lib/stores";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import Link from "next/link";
import { ArrowLeft, PanelRight, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function EditorPage() {
  const { showCaptionEditor, project } = useEditorStore();
  const { preloadFFmpeg } = useVideoEditor();
  const [showAutoEdit, setShowAutoEdit] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Pre-warm FFmpeg WASM in the background
  useEffect(() => {
    preloadFFmpeg();
  }, [preloadFFmpeg]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base md:text-lg font-semibold truncate">
          {project?.name ? project.name : "Editor de Vídeo"}
        </h1>
        {project && (
          <span className="hidden sm:block text-xs text-zinc-500 ml-auto">
            {project.width}x{project.height} · {project.fps}fps ·{" "}
            {formatDuration(project.duration)}
          </span>
        )}
        {/* Mobile: toggle right panel */}
        <button
          onClick={() => setShowMobilePanel((v) => !v)}
          className="md:hidden ml-auto text-zinc-400 hover:text-white transition-colors p-1"
          aria-label="Painel de propriedades"
        >
          {showMobilePanel ? <X className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Toolbar — passes setShowAutoEdit so "IA Legendas" can open the panel */}
      <Toolbar onOpenAutoEdit={() => setShowAutoEdit(true)} />

      {/* Main area: Preview + Panels */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Auto-Edit Panel (left drawer, collapsible) */}
        {showAutoEdit && (
          <div className="hidden md:flex w-80 border-r border-zinc-800 flex-shrink-0 overflow-hidden flex-col">
            <AutoEditPanel onClose={() => setShowAutoEdit(false)} />
          </div>
        )}

        {/* Preview */}
        <div className="flex-1 flex flex-col p-2 md:p-4 min-w-0">
          <VideoPreview />
        </div>

        {/* Right panel: Caption editor or Clip properties — hidden on mobile unless toggled */}
        <div className={`${showMobilePanel ? 'flex' : 'hidden'} md:flex w-full md:w-72 absolute md:relative inset-0 md:inset-auto z-30 md:z-auto border-l border-zinc-800 overflow-y-auto flex-shrink-0 bg-zinc-950 flex-col`}>
          {showCaptionEditor ? (
            <CaptionEditor />
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Propriedades
                </h2>
                <button
                  onClick={() => setShowMobilePanel(false)}
                  className="md:hidden text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ClipProperties />
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-shrink-0 max-h-48 md:max-h-64 overflow-x-auto overflow-y-auto">
        <Timeline />
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
