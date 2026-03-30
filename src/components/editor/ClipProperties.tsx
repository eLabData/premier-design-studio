"use client";

import { useEditorStore } from "@/lib/stores";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import type { VideoClip, Transition } from "@/types/project";

const TRANSITIONS: { value: Transition["type"]; label: string }[] = [
  { value: "cut", label: "Corte direto" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
];

export function ClipProperties() {
  const { project, selectedClipId, updateClip } = useEditorStore();
  const { trimClip, removeClip } = useVideoEditor();

  if (!project || !selectedClipId) {
    return (
      <div className="space-y-4 text-sm text-zinc-500">
        <p>Selecione um clip na timeline para editar suas propriedades.</p>
      </div>
    );
  }

  let selectedClip: VideoClip | null = null;
  for (const track of project.tracks) {
    const found = track.clips.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      break;
    }
  }

  if (!selectedClip) {
    return (
      <div className="space-y-4 text-sm text-zinc-500">
        <p>Clip não encontrado.</p>
      </div>
    );
  }

  const clip = selectedClip;
  const duration = clip.end_time - clip.start_time;
  const sourceName = clip.source_url.split("/").pop()?.split("?")[0] ?? "clip";
  const isOverlay = clip.position !== undefined;

  return (
    <div className="space-y-4 text-sm">
      {/* Source info */}
      <Section title="Arquivo">
        <Row label="Nome" value={sourceName} />
        <Row label="Duração" value={`${duration.toFixed(2)}s`} />
      </Section>

      {/* Timing */}
      <Section title="Temporização">
        <NumberField
          label="Início na timeline (s)"
          value={clip.start_time}
          min={0}
          step={0.1}
          onChange={(v) =>
            updateClip(clip.id, (c) => ({
              ...c,
              start_time: v,
              end_time: v + (c.end_time - c.start_time),
            }))
          }
        />
        <NumberField
          label="Trim início (s)"
          value={clip.trim_start}
          min={0}
          step={0.1}
          onChange={(v) => trimClip(clip.id, v, clip.trim_end)}
        />
        <NumberField
          label="Trim fim (s)"
          value={clip.trim_end}
          min={clip.trim_start + 0.1}
          step={0.1}
          onChange={(v) => trimClip(clip.id, clip.trim_start, v)}
        />
      </Section>

      {/* Overlay settings */}
      {isOverlay && (
        <Section title="Posição (Overlay)">
          <NumberField
            label="X"
            value={clip.position?.x ?? 0}
            step={1}
            onChange={(v) =>
              updateClip(clip.id, (c) => ({
                ...c,
                position: { x: v, y: c.position?.y ?? 0 },
              }))
            }
          />
          <NumberField
            label="Y"
            value={clip.position?.y ?? 0}
            step={1}
            onChange={(v) =>
              updateClip(clip.id, (c) => ({
                ...c,
                position: { x: c.position?.x ?? 0, y: v },
              }))
            }
          />
          <NumberField
            label="Largura"
            value={clip.size?.width ?? 320}
            min={10}
            step={10}
            onChange={(v) =>
              updateClip(clip.id, (c) => ({
                ...c,
                size: { width: v, height: c.size?.height ?? 180 },
              }))
            }
          />
          <NumberField
            label="Altura"
            value={clip.size?.height ?? 180}
            min={10}
            step={10}
            onChange={(v) =>
              updateClip(clip.id, (c) => ({
                ...c,
                size: { width: c.size?.width ?? 320, height: v },
              }))
            }
          />
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Opacidade</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.opacity ?? 1}
              onChange={(e) =>
                updateClip(clip.id, (c) => ({
                  ...c,
                  opacity: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-green-500"
            />
            <span className="text-xs text-zinc-600">
              {Math.round((clip.opacity ?? 1) * 100)}%
            </span>
          </div>
        </Section>
      )}

      {/* Transition */}
      <Section title="Transição">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Tipo</label>
          <select
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-green-500"
            value={clip.transition?.type ?? "cut"}
            onChange={(e) =>
              updateClip(clip.id, (c) => ({
                ...c,
                transition: {
                  type: e.target.value as Transition["type"],
                  duration: c.transition?.duration ?? 0.5,
                },
              }))
            }
          >
            {TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {clip.transition && clip.transition.type !== "cut" && (
          <NumberField
            label="Duração (s)"
            value={clip.transition.duration}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) =>
              updateClip(clip.id, (c) => ({
                ...c,
                transition: { type: c.transition?.type ?? "fade", duration: v },
              }))
            }
          />
        )}
      </Section>

      {/* Danger */}
      <button
        className="w-full px-3 py-2 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-900/20 text-sm transition-colors"
        onClick={() => removeClip(clip.id)}
      >
        Remover clip
      </button>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500 text-xs">{label}</span>
      <span className="text-zinc-300 text-xs truncate max-w-[120px]" title={value}>
        {value}
      </span>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-zinc-500 text-xs flex-1">{label}</label>
      <input
        type="number"
        className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500 text-right"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
