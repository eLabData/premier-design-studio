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
  Wand2,
  SlidersHorizontal,
  Loader2,
  Undo2,
  ZoomIn,
  Info,
} from 'lucide-react'
import { AIChatPanel, type AIAction } from '@/components/ai/AIChatPanel'
import { trackUsage } from '@/lib/analytics'

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  grayscale: number
  sepia: number
  hueRotate: number
}

interface AIModelOption {
  id: string
  label: string
  description: string
  output: string
  costLabel: string
  costUsd: number
  badge?: string
  badgeColor?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

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

const QUICK_PROMPTS = [
  { label: 'Remover texto/watermark', prompt: 'Remove all overlaid text, watermarks, and icons from this photo. Restore the natural content underneath.' },
  { label: 'Melhorar qualidade', prompt: 'Enhance this photo quality, improve sharpness, lighting, and overall clarity while keeping the same composition.' },
  { label: 'Remover fundo', prompt: 'Remove the background and replace it with a clean, solid white background. Keep the subject perfectly intact.' },
  { label: 'Fundo desfocado', prompt: 'Apply a professional bokeh blur effect to the background while keeping the main subject in sharp focus.' },
  { label: 'Corrigir iluminação', prompt: 'Fix the lighting in this photo. Make it well-lit and natural looking, remove shadows from the face.' },
  { label: 'Estilo profissional', prompt: 'Transform this into a professional headshot style photo with clean lighting and professional appearance.' },
]

const UPSCALE_MODELS: AIModelOption[] = [
  {
    id: 'aura-sr',
    label: 'AuraSR v2 — Realista',
    description: 'Upscale fiel e conservador. Aumenta resolucao 4x sem alterar o conteudo da imagem. Ideal pra fotos de pessoas, paisagens e produtos. Preserva textura de pele e detalhes finos.',
    output: 'Mesma imagem em resolucao 4x maior. Sem alteracoes no conteudo, cores ou estilo.',
    costLabel: '~R$0.02',
    costUsd: 0.005,
    badge: 'Recomendado',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  {
    id: 'recraft-crisp',
    label: 'Recraft Crisp — Nitidez + Rostos',
    description: 'Especializado em refinar detalhes pequenos e rostos. Aumenta resolucao com foco em nitidez e definicao facial. Otimo pra retratos e fotos profissionais.',
    output: 'Imagem mais nitida com detalhes faciais refinados. Resolucao aumentada com foco em clareza.',
    costLabel: '~R$0.02',
    costUsd: 0.004,
    badge: 'Rostos',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  {
    id: 'real-esrgan',
    label: 'Real-ESRGAN — Classico',
    description: 'Modelo classico de upscale usado pela industria. Aumenta 2x ou 4x com bom balanco entre velocidade e qualidade. Funciona bem pra qualquer tipo de imagem.',
    output: 'Imagem em resolucao 2x/4x. Resultado solido e previsivel, sem surpresas.',
    costLabel: '~R$0.05',
    costUsd: 0.01,
  },
  {
    id: 'creative-upscaler',
    label: 'Creative Upscaler — Estilo 3D/Artistico',
    description: 'Upscaler GENERATIVO que REDESENHA a imagem com IA. Cria detalhes novos que nao existiam. Pode alterar rosto, pele e estilo significativamente. NAO recomendado pra fotos realistas de pessoas.',
    output: 'Imagem reimaginada em alta resolucao com estilo artistico/3D. O resultado pode parecer diferente do original.',
    costLabel: '~R$0.20',
    costUsd: 0.04,
    badge: 'Artistico',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

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

type EditMode = 'filters' | 'ai-edit' | 'upscale'

// ── Component ────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [showChat, setShowChat] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [editMode, setEditMode] = useState<EditMode>('filters')
  const [aiPrompt, setAiPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('')
  const [imageHistory, setImageHistory] = useState<string[]>([])
  const [lastUsage, setLastUsage] = useState<{ costUsd: number; model: string; durationMs: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImageDataUrl(dataUrl)
      setImageHistory([])
      setLastUsage(null)
    }
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

  const handleAIAction = (action: AIAction) => {
    if (action.type === 'apply_filter' && action.params) {
      const incoming = action.params as Partial<FilterState>
      setFilters((prev) => ({ ...prev, ...incoming }))
    }
  }

  const callImageAPI = async (
    model: string,
    prompt: string,
    module: 'image_edit' | 'image_upscale',
    extraParams?: Record<string, unknown>,
  ) => {
    if (!imageDataUrl || isProcessing) return
    setIsProcessing(true)

    try {
      setImageHistory((prev) => [...prev, imageDataUrl])

      const res = await fetch('/api/ai/image-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageData: imageDataUrl,
          model,
          extraParams,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar')

      if (data.imageUrl) {
        const imgRes = await fetch(data.imageUrl)
        const blob = await imgRes.blob()
        const reader = new FileReader()
        reader.onload = () => setImageDataUrl(reader.result as string)
        reader.readAsDataURL(blob)

        if (data.usage) {
          setLastUsage({
            costUsd: data.usage.costUsd,
            model: data.usage.model,
            durationMs: data.usage.durationMs,
          })

          trackUsage({
            userId: 'current',
            module,
            model: data.usage.model,
            provider: 'fal_ai',
            inputTokens: 0,
            outputTokens: 0,
            cost: data.usage.costUsd,
            durationMs: data.usage.durationMs,
            metadata: {
              prompt,
              billableUnits: data.usage.billableUnits,
              requestId: data.usage.requestId,
            },
          })
        }
      }

      setAiPrompt('')
    } catch (err) {
      console.error('AI error:', err)
      setImageHistory((prev) => prev.slice(0, -1))
      alert(err instanceof Error ? err.message : 'Erro ao processar imagem')
    } finally {
      setIsProcessing(false)
      setProcessingLabel('')
    }
  }

  const handleAIEdit = (prompt: string) => {
    setProcessingLabel('Editando com FLUX Kontext Pro…')
    callImageAPI('kontext-pro', prompt, 'image_edit')
  }

  const handleUpscale = (model: AIModelOption) => {
    setProcessingLabel(`Upscaling com ${model.label.split('—')[0].trim()}…`)

    const modelMap: Record<string, string> = {
      'aura-sr': 'aura-sr',
      'recraft-crisp': 'recraft-crisp',
      'real-esrgan': 'real-esrgan',
      'creative-upscaler': 'creative-upscaler',
    }

    callImageAPI(
      modelMap[model.id] ?? model.id,
      'Upscale this image',
      'image_upscale',
      { scale: model.id === 'aura-sr' ? 4 : 2 },
    )
  }

  const handleUndo = () => {
    if (imageHistory.length === 0) return
    const prev = imageHistory[imageHistory.length - 1]
    setImageHistory((h) => h.slice(0, -1))
    setImageDataUrl(prev)
    setLastUsage(null)
  }

  const handleDownload = () => {
    if (!imageDataUrl) return

    if (editMode !== 'filters') {
      const link = document.createElement('a')
      link.download = 'foto-editada.png'
      link.href = imageDataUrl
      link.click()
      return
    }

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

        {/* Last usage cost badge */}
        {lastUsage && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400">
            <span>Ultimo: ${lastUsage.costUsd.toFixed(3)} USD</span>
            <span className="text-zinc-600">·</span>
            <span>{(lastUsage.durationMs / 1000).toFixed(1)}s</span>
          </div>
        )}

        {/* Undo */}
        {imageHistory.length > 0 && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors min-h-[36px]"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desfazer</span>
          </button>
        )}

        {/* Mobile: toggle chat */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className="md:hidden text-zinc-400 hover:text-white transition-colors p-1"
          aria-label="Chat IA"
        >
          {showChat ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors min-h-[36px]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

        <button
          onClick={handleDownload}
          disabled={!imageDataUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-white transition-colors min-h-[36px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </button>

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
        {/* Photo + tools column */}
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

            {isProcessing && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-sm text-zinc-300">{processingLabel || 'Processando…'}</p>
                </div>
              </div>
            )}

            {imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imageDataUrl}
                alt="Foto para editar"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                style={{ filter: editMode === 'filters' ? buildCssFilter(filters) : undefined }}
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

          {/* Bottom panel: mode tabs + tools */}
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900/50">
            {/* Mode tabs */}
            <div className="flex items-center gap-1 px-4 pt-2">
              <button
                onClick={() => setEditMode('filters')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  editMode === 'filters' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
              </button>
              <button
                onClick={() => setEditMode('ai-edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  editMode === 'ai-edit'
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Edicao IA
              </button>
              <button
                onClick={() => setEditMode('upscale')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  editMode === 'upscale'
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Upscale
              </button>
            </div>

            {/* ── Filters panel ── */}
            {editMode === 'filters' && (
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Filtros e Ajustes</p>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
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
                        <span className="text-xs text-zinc-500 tabular-nums">{filters[key]}{unit}</span>
                      </div>
                      <input
                        type="range"
                        min={min} max={max} step={step}
                        value={filters[key]}
                        onChange={(e) => handleFilterChange(key, Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-green-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI Edit panel ── */}
            {editMode === 'ai-edit' && (
              <div className="px-4 py-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => handleAIEdit(qp.prompt)}
                      disabled={!imageDataUrl || isProcessing}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIEdit(aiPrompt) }
                    }}
                    placeholder="Descreva a edicao… (ex: remover fundo, melhorar iluminacao, trocar cor da roupa)"
                    disabled={!imageDataUrl || isProcessing}
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={() => handleAIEdit(aiPrompt)}
                    disabled={!imageDataUrl || !aiPrompt.trim() || isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Editar
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600">
                  FLUX Kontext Pro · ~R$0.25 por edicao · A imagem original e preservada, so o que voce pedir e alterado
                </p>
              </div>
            )}

            {/* ── Upscale panel ── */}
            {editMode === 'upscale' && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Escolha o modelo de upscale</p>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hidden group-hover:block z-50 shadow-xl">
                      Cada modelo produz um resultado diferente. Leia a descricao e o &ldquo;Resultado esperado&rdquo; antes de escolher. O custo e cobrado por geracao.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {UPSCALE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleUpscale(model)}
                      disabled={!imageDataUrl || isProcessing}
                      className="group text-left p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-cyan-500/40 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 transition-colors leading-tight">
                          {model.label}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {model.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${model.badgeColor}`}>
                              {model.badge}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-zinc-700/50 text-[9px] font-mono text-zinc-400">
                            {model.costLabel}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mb-1.5">
                        {model.description}
                      </p>
                      <div className="flex items-start gap-1">
                        <span className="text-[9px] font-semibold text-zinc-600 uppercase shrink-0 mt-px">Resultado:</span>
                        <span className="text-[10px] text-zinc-400 leading-relaxed">{model.output}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-zinc-600 mt-2">
                  Dica: pra fotos de pessoas, use AuraSR v2 ou Recraft Crisp. O Creative Upscaler transforma a imagem em estilo artistico/3D.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat */}
        {showChat && (
          <>
            <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setShowChat(false)} />
            <div className="fixed md:relative bottom-0 right-0 md:bottom-auto md:right-auto z-40 md:z-auto w-full md:w-80 h-[70vh] md:h-auto md:flex-shrink-0 overflow-hidden flex flex-col rounded-t-2xl md:rounded-none">
              <AIChatPanel context="photo" onAction={handleAIAction} className="flex-1 md:h-full" inline />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
