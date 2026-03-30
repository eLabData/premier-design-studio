'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, Grid3x3 } from 'lucide-react'
import { useCanvasEditor, type ElementProps } from '@/hooks/useCanvasEditor'

interface Props {
  width: number
  height: number
  onEditorReady?: (editor: ReturnType<typeof useCanvasEditor>) => void
  onSelectionChange?: (props: ElementProps | null) => void
}

export function CanvasWorkspace({ width, height, onEditorReady, onSelectionChange }: Props) {
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const editor = useCanvasEditor()
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // compute display scale so canvas fits the container
  const computeScale = useCallback(() => {
    if (!wrapperRef.current) return
    const available = {
      w: wrapperRef.current.clientWidth - 64,
      h: wrapperRef.current.clientHeight - 64,
    }
    const s = Math.min(available.w / width, available.h / height, 1)
    setScale(s)
  }, [width, height])

  useEffect(() => {
    computeScale()
    const ro = new ResizeObserver(computeScale)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [computeScale])

  useEffect(() => {
    if (!canvasEl.current) return
    let disposed = false
    editor.initCanvas(canvasEl.current, width, height, onSelectionChange).then((canvas) => {
      if (disposed) return
      setInitialized(true)
      onEditorReady?.(editor)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(canvas as any).__initialized = true
    })
    return () => {
      disposed = true
      editor.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  // re-notify parent when canvas changes size (format switch)
  useEffect(() => {
    if (initialized) {
      onEditorReady?.(editor)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized])

  const adjustZoom = (delta: number) => {
    setZoom((z) => Math.min(Math.max(z + delta, 0.25), 3))
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 flex flex-col items-center justify-center bg-zinc-900/30 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-1.5 py-1">
        <button
          onClick={() => setShowGrid((g) => !g)}
          className={`p-1.5 rounded transition-colors ${showGrid ? 'text-green-400' : 'text-zinc-400 hover:text-white'}`}
          title="Grade"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-zinc-700" />
        <button onClick={() => adjustZoom(-0.1)} className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors" title="Diminuir zoom">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs text-zinc-400 w-10 text-center">{Math.round(zoom * scale * 100)}%</span>
        <button onClick={() => adjustZoom(0.1)} className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors" title="Aumentar zoom">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas container */}
      <div
        className="relative shadow-2xl"
        style={{
          transform: `scale(${scale * zoom})`,
          transformOrigin: 'center center',
          width,
          height,
        }}
      >
        <canvas ref={canvasEl} />

        {/* Grid overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        )}
      </div>

      {/* Size label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-600 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
        {width} × {height}
      </div>
    </div>
  )
}
