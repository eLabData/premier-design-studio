"use client";

import { useEditorStore } from "@/lib/stores";
import { useState, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Caption, CaptionStyle } from "@/types/project";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatSRT(captions: Caption[]): string {
  return captions
    .map((cap, i) => {
      const fmt = (t: number) => {
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = Math.floor(t % 60);
        const ms = Math.round((t % 1) * 1000);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      return `${i + 1}\n${fmt(cap.start_time)} --> ${fmt(cap.end_time)}\n${cap.text}`;
    })
    .join("\n\n");
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "sans-serif",
  fontSize: 24,
  color: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.6)",
  position: "bottom",
  animation: "none",
};

export function CaptionEditor() {
  const { project, currentTime, addCaption, updateCaption, removeCaption, toggleCaptionEditor } =
    useEditorStore();

  const [editingId, setEditingId] = useState<string | null>(null);

  const captions = project?.captions ?? [];

  const handleAdd = useCallback(() => {
    const newCaption: Caption = {
      id: generateId(),
      text: "Nova legenda",
      start_time: currentTime,
      end_time: currentTime + 3,
      style: { ...DEFAULT_STYLE },
    };
    addCaption(newCaption);
    setEditingId(newCaption.id);
  }, [addCaption, currentTime]);

  const handleExportSRT = useCallback(() => {
    const content = formatSRT(captions);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name ?? "legendas"}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [captions, project]);

  if (!project) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Editor de Legendas</h2>
        <button
          className="text-zinc-500 hover:text-white transition-colors"
          onClick={toggleCaptionEditor}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Caption list */}
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {captions.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-6">
            Nenhuma legenda ainda. Clique em &quot;Adicionar&quot; para começar.
          </p>
        )}

        {captions.map((cap) => (
          <div
            key={cap.id}
            className={`border rounded-lg p-3 space-y-2 cursor-pointer transition-colors ${
              editingId === cap.id
                ? "border-green-500 bg-zinc-800/80"
                : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
            }`}
            onClick={() => setEditingId(editingId === cap.id ? null : cap.id)}
          >
            {/* Time row */}
            <div className="flex items-center gap-2 text-xs">
              <TimeInput
                label="Início"
                value={cap.start_time}
                onChange={(v) =>
                  updateCaption(cap.id, (c) => ({ ...c, start_time: v }))
                }
              />
              <span className="text-zinc-600">→</span>
              <TimeInput
                label="Fim"
                value={cap.end_time}
                onChange={(v) =>
                  updateCaption(cap.id, (c) => ({ ...c, end_time: v }))
                }
              />
              <button
                className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCaption(cap.id);
                  if (editingId === cap.id) setEditingId(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text */}
            <textarea
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 resize-none focus:outline-none focus:border-green-500 transition-colors"
              rows={2}
              value={cap.text}
              onChange={(e) =>
                updateCaption(cap.id, (c) => ({ ...c, text: e.target.value }))
              }
              onClick={(e) => e.stopPropagation()}
            />

            {/* Style options — shown when expanded */}
            {editingId === cap.id && (
              <div className="space-y-2 pt-1 border-t border-zinc-700">
                <div className="grid grid-cols-2 gap-2">
                  {/* Font size */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">Tamanho</span>
                    <input
                      type="number"
                      min={10}
                      max={72}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500"
                      value={cap.style.fontSize}
                      onChange={(e) =>
                        updateCaption(cap.id, (c) => ({
                          ...c,
                          style: { ...c.style, fontSize: Number(e.target.value) },
                        }))
                      }
                    />
                  </label>

                  {/* Color */}
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">Cor do texto</span>
                    <input
                      type="color"
                      className="h-8 w-full rounded cursor-pointer bg-zinc-900 border border-zinc-700"
                      value={cap.style.color}
                      onChange={(e) =>
                        updateCaption(cap.id, (c) => ({
                          ...c,
                          style: { ...c.style, color: e.target.value },
                        }))
                      }
                    />
                  </label>
                </div>

                {/* Position */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">Posição</span>
                  <select
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500"
                    value={cap.style.position}
                    onChange={(e) =>
                      updateCaption(cap.id, (c) => ({
                        ...c,
                        style: {
                          ...c.style,
                          position: e.target.value as CaptionStyle["position"],
                        },
                      }))
                    }
                  >
                    <option value="top">Superior</option>
                    <option value="center">Centro</option>
                    <option value="bottom">Inferior</option>
                  </select>
                </label>

                {/* Animation */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">Animação</span>
                  <select
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500"
                    value={cap.style.animation ?? "none"}
                    onChange={(e) =>
                      updateCaption(cap.id, (c) => ({
                        ...c,
                        style: {
                          ...c.style,
                          animation: e.target.value as CaptionStyle["animation"],
                        },
                      }))
                    }
                  >
                    <option value="none">Nenhuma</option>
                    <option value="fade">Fade</option>
                    <option value="typewriter">Máquina de escrever</option>
                    <option value="highlight">Destaque</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-zinc-800 space-y-2">
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm transition-colors"
          onClick={handleAdd}
        >
          <Plus className="w-4 h-4" />
          Adicionar legenda
        </button>
        {captions.length > 0 && (
          <button
            className="w-full px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors"
            onClick={handleExportSRT}
          >
            Exportar .SRT
          </button>
        )}
      </div>
    </div>
  );
}

// ── TimeInput helper ──────────────────────────────────────────────────────────

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, "0");
    return `${m}:${s}`;
  };

  const parse = (raw: string): number => {
    const parts = raw.split(":");
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(raw) || 0;
  };

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-zinc-600">{label}</span>
      <input
        className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 w-16 focus:outline-none focus:border-green-500 font-mono"
        defaultValue={fmt(value)}
        onBlur={(e) => onChange(parse(e.target.value))}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}
