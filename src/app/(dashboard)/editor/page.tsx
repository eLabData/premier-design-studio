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
import { ArrowLeft, PanelRight, X, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AIChatPanel } from "@/components/ai/AIChatPanel";

export default function EditorPage() {
  const { showCaptionEditor, project } = useEditorStore();
  const { preloadFFmpeg } = useVideoEditor();
  const [showAutoEdit, setShowAutoEdit] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  // Right panel tab: 'props' | 'chat'
  const [rightTab, setRightTab] = useState<'props' | 'chat'>('props');

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
        {/* Desktop: toggle AI chat */}
        <button
          onClick={() => { setShowAIChat((v) => !v); setRightTab('chat'); setShowMobilePanel(true); }}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
            rightTab === 'chat' && showMobilePanel
              ? 'bg-green-500/20 border-green-500/40 text-green-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
          }`}
          title="Chat IA"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Chat IA</span>
        </button>
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
        <div className={`${showMobilePanel ? 'flex' : 'hidden'} md:flex w-full md:w-72 absolute md:relative inset-0 md:inset-auto z-30 md:z-auto border-l border-zinc-800 flex-shrink-0 bg-zinc-950 flex-col overflow-hidden`}>
          {/* Tab bar */}
          <div className="flex items-center border-b border-zinc-800 shrink-0">
            <button
              onClick={() => setRightTab('props')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                rightTab === 'props'
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Propriedades
            </button>
            <button
              onClick={() => setRightTab('chat')}
              className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                rightTab === 'chat'
                  ? 'text-white border-b-2 border-green-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
              Chat IA
            </button>
            <button
              onClick={() => setShowMobilePanel(false)}
              className="md:hidden px-3 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {rightTab === 'chat' ? (
            <AIChatPanel context="video" inline className="flex-1" />
          ) : showCaptionEditor ? (
            <div className="flex-1 overflow-y-auto">
              <CaptionEditor />
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto">
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
