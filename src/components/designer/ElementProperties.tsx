'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import type { ElementProps } from '@/hooks/useCanvasEditor'

interface Props {
  element: ElementProps
  onUpdate: (props: Partial<ElementProps>) => void
  onBringForward: () => void
  onSendBackward: () => void
  onRemove: () => void
}

const FONT_FAMILIES = ['Arial', 'Georgia', 'Helvetica', 'Impact', 'Times New Roman', 'Verdana', 'Courier New']

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{children}</span>
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <Label>{label}</Label>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-green-500/60"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-zinc-700 bg-transparent"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-green-500/60"
        />
      </div>
    </div>
  )
}

export function ElementProperties({ element, onUpdate, onBringForward, onSendBackward, onRemove }: Props) {
  const isText = element.type === 'i-text' || element.type === 'text' || element.type === 'textbox'
  const isImage = element.type === 'image'
  const isShape = element.type === 'rect' || element.type === 'circle' || element.type === 'ellipse' || element.type === 'line'

  return (
    <div className="space-y-4 text-sm">
      {/* Position & Size */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Posição e Tamanho</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={element.left} onChange={(v) => onUpdate({ left: v })} />
          <NumberField label="Y" value={element.top} onChange={(v) => onUpdate({ top: v })} />
          <NumberField label="Largura" value={element.width * (element.scaleX ?? 1)} onChange={(v) => onUpdate({ width: v })} min={1} />
          <NumberField label="Altura" value={element.height * (element.scaleY ?? 1)} onChange={(v) => onUpdate({ height: v })} min={1} />
        </div>
      </div>

      {/* Transform */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Transformação</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Rotação" value={element.angle} onChange={(v) => onUpdate({ angle: v })} min={0} max={360} />
          <NumberField label="Opacidade" value={element.opacity * 100} onChange={(v) => onUpdate({ opacity: v / 100 })} min={0} max={100} />
        </div>
      </div>

      {/* Text-specific */}
      {isText && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Texto</p>
          <div className="space-y-2">
            <div className="flex flex-col gap-0.5">
              <Label>Fonte</Label>
              <select
                value={element.fontFamily ?? 'Arial'}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="w-full px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-green-500/60"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Tamanho" value={element.fontSize ?? 48} onChange={(v) => onUpdate({ fontSize: v })} min={6} max={500} />
              <NumberField label="Linha" value={element.lineHeight ?? 1.2} onChange={(v) => onUpdate({ lineHeight: v })} min={0.5} max={4} step={0.1} />
            </div>
            <ColorField label="Cor do Texto" value={element.fill ?? '#000000'} onChange={(v) => onUpdate({ fill: v })} />
            <div className="flex flex-col gap-0.5">
              <Label>Peso</Label>
              <select
                value={element.fontWeight ?? 'normal'}
                onChange={(e) => onUpdate({ fontWeight: e.target.value })}
                className="w-full px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-green-500/60"
              >
                {['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <Label>Alinhamento</Label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdate({ textAlign: align })}
                    className={`flex-1 py-1 rounded text-xs transition-colors ${element.textAlign === align ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                  >
                    {align === 'left' ? 'Esq' : align === 'center' ? 'Ctr' : 'Dir'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image-specific */}
      {isImage && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Imagem</p>
          <div className="space-y-2">
            <NumberField label="Borda arredondada" value={element.rx ?? 0} onChange={(v) => onUpdate({ rx: v })} min={0} max={500} />
          </div>
        </div>
      )}

      {/* Shape-specific */}
      {isShape && (
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Forma</p>
          <div className="space-y-2">
            <ColorField label="Preenchimento" value={element.fill ?? '#22c55e'} onChange={(v) => onUpdate({ fill: v })} />
            <ColorField label="Borda" value={element.stroke ?? ''} onChange={(v) => onUpdate({ stroke: v })} />
            <NumberField label="Espessura da Borda" value={element.strokeWidth ?? 0} onChange={(v) => onUpdate({ strokeWidth: v })} min={0} max={50} />
            {element.type === 'rect' && (
              <NumberField label="Raio da Borda" value={element.rx ?? 0} onChange={(v) => onUpdate({ rx: v })} min={0} max={500} />
            )}
          </div>
        </div>
      )}

      {/* Layer order */}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Camada</p>
        <div className="flex gap-2">
          <button
            onClick={onBringForward}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            Avançar
          </button>
          <button
            onClick={onSendBackward}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ChevronDown className="w-3 h-3" />
            Recuar
          </button>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="w-full py-1.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
      >
        Remover elemento
      </button>
    </div>
  )
}
