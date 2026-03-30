"use client";

import {
  Scissors,
  Layers,
  Type,
  Upload,
  Wand2,
  Download,
  ZoomIn,
  ZoomOut,
  Loader2,
} from "lucide-react";
import { useEditorStore } from "@/lib/stores";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import { useRef, useCallback } from "react";

export function Toolbar() {
  const {
    zoom,
    setZoom,
    project,
    selectedClipId,
    currentTime,
    exportStatus,
    exportProgress,
    toggleCaptionEditor,
  } = useEditorStore();

  const { importVideo, splitClipAtTime, addOverlayVideo, exportVideo } =
    useVideoEditor();

  const importInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const isExporting =
    exportStatus === "processing" || exportStatus === "loading";

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await importVideo(file);
      e.target.value = "";
    },
    [importVideo]
  );

  // ── Cut / Split ──────────────────────────────────────────────────────────

  const handleCut = useCallback(() => {
    if (!selectedClipId) return;
    splitClipAtTime(selectedClipId, currentTime);
  }, [selectedClipId, splitClipAtTime, currentTime]);

  // ── Overlay ──────────────────────────────────────────────────────────────

  const handleOverlayClick = useCallback(() => {
    overlayInputRef.current?.click();
  }, []);

  const handleOverlayFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await addOverlayVideo(
        file,
        { x: 10, y: 10 },
        { start: currentTime, end: 0 }
      );
      e.target.value = "";
    },
    [addOverlayVideo, currentTime]
  );

  // ── AI Captions (placeholder) ────────────────────────────────────────────

  const handleAICaptions = useCallback(() => {
    alert(
      "IA para legendas: integração com Whisper API em desenvolvimento.\nEm breve disponível!"
    );
  }, []);

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={importInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleImportFile}
      />
      <input
        ref={overlayInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleOverlayFile}
      />

      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-1">
          {/* Importar */}
          <ToolButton
            icon={Upload}
            label="Importar"
            onClick={handleImportClick}
          />

          {/* Cortar */}
          <ToolButton
            icon={Scissors}
            label="Cortar"
            onClick={handleCut}
            disabled={!selectedClipId || !project}
            title={
              !selectedClipId
                ? "Selecione um clip na timeline"
                : "Dividir clip no tempo atual"
            }
          />

          {/* Overlay */}
          <ToolButton
            icon={Layers}
            label="Overlay"
            onClick={handleOverlayClick}
            disabled={!project}
            title="Adicionar vídeo em picture-in-picture"
          />

          {/* Legenda manual */}
          <ToolButton
            icon={Type}
            label="Legenda"
            onClick={toggleCaptionEditor}
            disabled={!project}
            title="Abrir editor de legendas"
          />

          {/* AI Legendas */}
          <ToolButton
            icon={Wand2}
            label="IA Legendas"
            onClick={handleAICaptions}
            disabled={!project}
            title="Gerar legendas automaticamente com IA"
          />

          {/* Exportar */}
          <ToolButton
            icon={isExporting ? Loader2 : Download}
            label={
              isExporting
                ? exportProgress > 0
                  ? `${exportProgress}%`
                  : "Carregando…"
                : "Exportar"
            }
            onClick={exportVideo}
            disabled={!project || isExporting}
            title="Renderizar e baixar vídeo final"
            iconClass={isExporting ? "animate-spin" : undefined}
            highlight={exportStatus === "done"}
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Export progress bar */}
      {isExporting && (
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}
    </>
  );
}

// ── Sub-component: ToolButton ─────────────────────────────────────────────────

interface ToolButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  iconClass?: string;
  highlight?: boolean;
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
  iconClass,
  highlight,
}: ToolButtonProps) {
  return (
    <button
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        disabled
          ? "text-zinc-600 cursor-not-allowed"
          : highlight
          ? "text-green-400 hover:bg-zinc-800"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
    >
      <Icon className={`w-4 h-4 ${iconClass ?? ""}`} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
