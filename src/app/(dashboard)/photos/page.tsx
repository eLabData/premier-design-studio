'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Download,
  RotateCcw,
  MessageCircle,
  X,
  ImageIcon,
} from 'lucide-react'
import { AIChatPanel, type AIAction } from '@/components/ai/AIChatPanel'

interface FilterState {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  grayscale: number
  sepia: number
  hueRotate: number
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
}

const FILTER_CONFIG: {
  key: keyof FilterState
  label: string
  min: number
  max: number
  step: number
  unit: string
}[] = [
  { key: 'brightness', label: 'Brilho', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'contrast', label: 'Contraste', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'saturation', label: 'Saturação', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'blur', label: 'Desfoque', min: 0, max: 20, step: 0.5, unit: 'px' },
  { key: 'grayscale', label: 'Escala de cinza', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'sepia', label: 'Sépia', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'hueRotate', label: 'Matiz', min: 0, max: 360, step: 1, unit: '°' },
]

function buildCssFilter(f: FilterState): string {
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturation}%)`,
    `blur(${f.blur}px)`,
    `grayscale(${f.grayscale}%)`,
    `sepia(${f.sepia}%)`,
    `hue-rotate(${f.hueRotate}deg)`,
  ].join(' ')
}

export default function PhotosPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [showChat, setShowChat] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setImageDataUrl(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [])

  const handleReset = () => setFilters(DEFAULT_FILTERS)

  const handleFilterChange = (key: keyof FilterState, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // Handle actions from the AI chat (e.g. apply_filter)
  const handleAIAction = (action: AIAction) => {
    if (action.type === 'apply_filter' && action.params) {
      const incoming = action.params as Partial<FilterState>
      setFilters((prev) => ({ ...prev, ...incoming }))
    }
  }

  const handleDownload = () => {
    if (!imageDataUrl) return
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.filter = buildCssFilter(filters)
      ctx.drawImage(img, 0, 0)
      const link = document.createElement('a')
      link.download = 'foto-editada.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = imageDataUrl
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-semibold">Editor de Fotos</h1>
        <div className="flex-1" />

        {/* Mobile: toggle chat */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className="md:hidden text-zinc-400 hover:text-white transition-colors p-1"
          aria-label="Chat IA"
        >
          {showChat ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        </button>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors min-h-[36px]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!imageDataUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white transition-colors min-h-[36px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>

        {/* Desktop: toggle chat */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors min-h-[36px] ${
            showChat
              ? 'bg-green-500/20 border-green-500/40 text-green-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600'
          }`}
          aria-label="Chat IA"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Chat IA</span>
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Photo + filters column */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Photo preview */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/80 border-2 border-dashed border-green-500/60 rounded-lg m-2">
                <p className="text-green-400 text-sm font-medium">Solte a imagem aqui</p>
              </div>
            )}

            {imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imageDataUrl}
                alt="Foto para editar"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ filter: buildCssFilter(filters) }}
              />
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-green-500/50 transition-colors text-center max-w-xs"
              >
                <ImageIcon className="w-12 h-12 text-zinc-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-300">Carregar uma foto</p>
                  <p className="text-xs text-zinc-600">Clique ou arraste e solte aqui</p>
                </div>
              </button>
            )}
          </div>

          {/* Filters panel */}
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Filtros e Ajustes
              </p>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Resetar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resetar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3">
              {FILTER_CONFIG.map(({ key, label, min, max, step, unit }) => (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400">{label}</label>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {filters[key]}{unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={filters[key]}
                    onChange={(e) => handleFilterChange(key, Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-green-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI Chat — desktop always sidebar, mobile overlay */}
        {showChat && (
          <>
            {/* Mobile overlay backdrop */}
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/60"
              onClick={() => setShowChat(false)}
            />
            <div className="fixed md:relative bottom-0 right-0 md:bottom-auto md:right-auto z-40 md:z-auto w-full md:w-80 h-[70vh] md:h-auto md:flex-shrink-0 overflow-hidden flex flex-col rounded-t-2xl md:rounded-none">
              <AIChatPanel
                context="photo"
                onAction={handleAIAction}
                className="flex-1 md:h-full"
                inline
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
