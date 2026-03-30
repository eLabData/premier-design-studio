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
} from "lucide-react";
import { useEditorStore } from "@/lib/stores";

const tools = [
  { icon: Upload, label: "Importar", action: "import" },
  { icon: Scissors, label: "Cortar", action: "cut" },
  { icon: Layers, label: "Overlay", action: "overlay" },
  { icon: Type, label: "Legenda", action: "caption" },
  { icon: Wand2, label: "AI Legendas", action: "ai-caption" },
  { icon: Download, label: "Exportar", action: "export" },
] as const;

export function Toolbar() {
  const { zoom, setZoom } = useEditorStore();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80">
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.action}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={tool.label}
          >
            <tool.icon className="w-4 h-4" />
            <span className="hidden md:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-zinc-500 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={() => setZoom(Math.min(4, zoom + 0.25))}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
