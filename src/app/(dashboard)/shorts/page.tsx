'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Film,
  Globe,
  Smartphone,
  Monitor,
  Image,
  Video,
  Mic,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Wand2,
  RefreshCw,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Language = 'pt-br' | 'en'
type Format = 'short' | 'normal'
type VisualMode = 'images' | 'video_ai' | 'hybrid'
type TtsProvider = 'fal_ai' | 'elevenlabs' | 'openai'

interface CostEstimate {
  estimatedCredits: number
  estimatedDurationSec: number
  estimatedCostUsd?: number
  breakdown?: Record<string, unknown>
}

interface ShortItem {
  id: string
  title?: string
  status: string
  language?: string
  visualMode?: string
  createdAt?: string
  created_at?: string
  video_url?: string
  script?: string
  scenes?: unknown[]
  platform_metadata?: {
    youtube?: { title: string; description: string; hashtags: string[] }
    instagram?: { title: string; description: string; hashtags: string[] }
    tiktok?: { title: string; description: string; hashtags: string[] }
  }
}

// ── Status label map ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  generating_script: 'Gerando roteiro...',
  generating_audio: 'Gerando narracao...',
  generating_visuals: 'Gerando imagens...',
  composing: 'Compondo video...',
  generating_metadata: 'Gerando descricoes...',
  pending: 'Aguardando...',
  completed: 'Concluido',
  failed: 'Falhou',
}

// ── Copy button helper ────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : status === 'failed'
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShortsPage() {
  // Wizard state
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState<Language>('pt-br')
  const [format, setFormat] = useState<Format>('short')
  const [visualMode, setVisualMode] = useState<VisualMode>('images')
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>('fal_ai')
  const [captionStyle] = useState('bold')
  const [useCustomScript, setUseCustomScript] = useState(false)
  const [customScript, setCustomScript] = useState('')

  // Suggestions
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)

  // Cost
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false)

  // Result
  const [shortId, setShortId] = useState<string | null>(null)
  const [currentShort, setCurrentShort] = useState<ShortItem | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Gallery
  const [shorts, setShorts] = useState<ShortItem[]>([])
  const [loadingShorts, setLoadingShorts] = useState(false)

  // Platform tab
  const [platformTab, setPlatformTab] = useState<'youtube' | 'instagram' | 'tiktok'>('youtube')

  // Polling
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Gallery fetch ────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingShorts(true)
    fetch('/api/ai/shorts')
      .then(r => r.ok ? r.json() : { shorts: [] })
      .then(data => setShorts(data.shorts ?? data ?? []))
      .catch(() => {})
      .finally(() => setLoadingShorts(false))
  }, [])

  // ── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (step === 4 && shortId && currentShort?.status && !['completed', 'failed'].includes(currentShort.status)) {
      pollInterval.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/ai/shorts/${shortId}`)
          if (res.ok) {
            const data = await res.json()
            setCurrentShort(data.short ?? data)
          }
        } catch {}
      }, 3000)
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [step, shortId, currentShort?.status])

  // Stop polling when completed/failed
  useEffect(() => {
    if (currentShort?.status && ['completed', 'failed'].includes(currentShort.status)) {
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [currentShort?.status])

  // ── Estimate on step 3 mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (step === 3) fetchEstimate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── API calls ────────────────────────────────────────────────────────────────

  const suggestTopics = async () => {
    setLoadingTopics(true)
    try {
      const res = await fetch('/api/ai/shorts/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: 'tech', language, count: 5 }),
      })
      const data = await res.json()
      setSuggestedTopics(data.topics || [])
    } catch {}
    setLoadingTopics(false)
  }

  const fetchEstimate = async () => {
    setIsLoadingEstimate(true)
    try {
      const res = await fetch('/api/ai/shorts/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualMode, ttsProvider, sceneCount: 6 }),
      })
      setCostEstimate(await res.json())
    } catch {}
    setIsLoadingEstimate(false)
  }

  const generateShort = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          language,
          format,
          visualMode,
          ttsProvider,
          captionStyle,
          customScript: useCustomScript ? customScript : null,
        }),
      })
      const data = await res.json()
      setShortId(data.shortId)
      setCurrentShort(data.short ?? { id: data.shortId, status: 'pending' })
      setStep(4)
    } catch {}
    setIsGenerating(false)
  }

  const deleteShort = async (id: string) => {
    if (!confirm('Apagar este short? Isso libera espaco de armazenamento.')) return
    await fetch(`/api/ai/shorts/${id}`, { method: 'DELETE' })
    setShorts(prev => prev.filter(s => s.id !== id))
    if (shortId === id) {
      resetWizard()
    }
  }

  const resetWizard = () => {
    setStep(1)
    setTopic('')
    setCustomScript('')
    setUseCustomScript(false)
    setSuggestedTopics([])
    setCostEstimate(null)
    setShortId(null)
    setCurrentShort(null)
    setIsGenerating(false)
  }

  const openShort = (s: ShortItem) => {
    setShortId(s.id)
    setCurrentShort(s)
    setStep(4)
  }

  // ── Selector card helper ──────────────────────────────────────────────────────

  function SelectorCard({
    selected,
    onClick,
    children,
    disabled,
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
    disabled?: boolean
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-left p-3 rounded-xl border transition-all ${
          selected
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-zinc-700 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/60'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {children}
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Film className="w-5 h-5 text-purple-400" />
        <h1 className="text-base font-semibold">Gerador de Shorts</h1>
        <div className="flex-1" />
        <span className="text-xs text-zinc-500">Passo {step}/4</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Step progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  n < step
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : n === step
                    ? 'border-purple-500 text-purple-400'
                    : 'border-zinc-700 text-zinc-600'
                }`}
              >
                {n < step ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              {n < 4 && <div className={`flex-1 h-px ${n < step ? 'bg-purple-600' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Theme/Script ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Tema do Short</h2>
              <p className="text-sm text-zinc-500">Escolha o tema ou escreva um topico para o seu short.</p>
            </div>

            <div className="space-y-3">
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Ex: iPhone storage tips, AI chess life lessons..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
              />

              <button
                onClick={suggestTopics}
                disabled={loadingTopics}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-40 transition-colors"
              >
                {loadingTopics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Sugerir Temas
              </button>

              {suggestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map(t => (
                    <button
                      key={t}
                      onClick={() => setTopic(t)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        topic === t
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Idioma</label>
              <div className="flex gap-2">
                {(['pt-br', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      language === lang
                        ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                        : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    {lang === 'pt-br' ? 'PT-BR' : 'EN'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom script toggle */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUseCustomScript(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    useCustomScript ? 'bg-purple-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      useCustomScript ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-zinc-300">Usar script proprio</span>
              </div>
              {useCustomScript && (
                <textarea
                  value={customScript}
                  onChange={e => setCustomScript(e.target.value)}
                  placeholder="Escreva seu script aqui..."
                  rows={6}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
                />
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!topic.trim() && !useCustomScript}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors ml-auto"
            >
              Proximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 2: Configuration ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Configuracao</h2>
              <p className="text-sm text-zinc-500">Escolha o formato, visual e narracao do seu short.</p>
            </div>

            {/* Formato */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Formato</label>
              <div className="grid grid-cols-2 gap-3">
                <SelectorCard selected={format === 'short'} onClick={() => setFormat('short')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">Short (9:16)</span>
                  </div>
                  <p className="text-xs text-zinc-500">TikTok, Reels, Shorts</p>
                </SelectorCard>
                <SelectorCard selected={format === 'normal'} onClick={() => setFormat('normal')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">Normal (16:9)</span>
                  </div>
                  <p className="text-xs text-zinc-500">YouTube</p>
                </SelectorCard>
              </div>
            </div>

            {/* Visual */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Visual</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectorCard selected={visualMode === 'images'} onClick={() => setVisualMode('images')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Image className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">Imagens + Motion</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">Rapido, barato</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-green-500/20 text-green-400 border-green-500/30">
                    ~R$0.10
                  </span>
                </SelectorCard>
                <SelectorCard selected={visualMode === 'video_ai'} onClick={() => setVisualMode('video_ai')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">Video AI</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">Dinamico, mais caro</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-orange-500/20 text-orange-400 border-orange-500/30">
                    ~R$5-20
                  </span>
                </SelectorCard>
                <SelectorCard selected={visualMode === 'hybrid'} onClick={() => setVisualMode('hybrid')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Film className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">Hibrido</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">Mix dos dois</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-blue-500/20 text-blue-400 border-blue-500/30">
                    ~R$4-8
                  </span>
                </SelectorCard>
              </div>
            </div>

            {/* Narracao */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Narracao</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectorCard selected={ttsProvider === 'fal_ai'} onClick={() => setTtsProvider('fal_ai')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">fal.ai TTS</span>
                  </div>
                  <p className="text-xs text-zinc-500">Rapido, barato</p>
                </SelectorCard>
                <SelectorCard selected={ttsProvider === 'elevenlabs'} onClick={() => setTtsProvider('elevenlabs')} disabled>
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">ElevenLabs</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">Mais natural, clonagem de voz</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-zinc-700 text-zinc-400 border-zinc-600">
                    Em breve
                  </span>
                </SelectorCard>
                <SelectorCard selected={ttsProvider === 'openai'} onClick={() => setTtsProvider('openai')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-200">OpenAI TTS</span>
                  </div>
                  <p className="text-xs text-zinc-500">Boa qualidade</p>
                </SelectorCard>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-sm font-medium text-white transition-colors"
              >
                Proximo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview + Cost ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Revisao + Custo</h2>
              <p className="text-sm text-zinc-500">Confira o resumo e o custo estimado antes de gerar.</p>
            </div>

            {/* Cost estimate */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estimativa de custo</span>
                <button
                  onClick={fetchEstimate}
                  disabled={isLoadingEstimate}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEstimate ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {isLoadingEstimate ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculando...
                </div>
              ) : costEstimate ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-white tabular-nums">
                      {costEstimate.estimatedCredits}
                    </span>
                    <span className="text-sm text-zinc-400 mb-1">creditos</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>Duracao estimada: ~{costEstimate.estimatedDurationSec}s</span>
                    {costEstimate.estimatedCostUsd !== undefined && (
                      <span className="text-zinc-500">${costEstimate.estimatedCostUsd.toFixed(3)} USD</span>
                    )}
                  </div>
                  {costEstimate.breakdown && (
                    <div className="text-xs text-zinc-600 space-y-1">
                      {Object.entries(costEstimate.breakdown).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span>{k}</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-600">Nao foi possivel calcular a estimativa.</p>
              )}
            </div>

            {/* Editable topic/script */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {useCustomScript ? 'Script' : 'Topico'}
              </label>
              <textarea
                value={useCustomScript ? customScript : topic}
                onChange={e => useCustomScript ? setCustomScript(e.target.value) : setTopic(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 resize-none"
              />
            </div>

            {/* Config summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-500">
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="font-medium text-zinc-400 mb-0.5">Idioma</div>
                <div className="text-zinc-300">{language === 'pt-br' ? 'PT-BR' : 'EN'}</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="font-medium text-zinc-400 mb-0.5">Formato</div>
                <div className="text-zinc-300">{format === 'short' ? '9:16 Short' : '16:9 Normal'}</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="font-medium text-zinc-400 mb-0.5">Visual</div>
                <div className="text-zinc-300">{visualMode === 'images' ? 'Imagens' : visualMode === 'video_ai' ? 'Video AI' : 'Hibrido'}</div>
              </div>
              <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2.5">
                <div className="font-medium text-zinc-400 mb-0.5">TTS</div>
                <div className="text-zinc-300">{ttsProvider === 'fal_ai' ? 'fal.ai' : ttsProvider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={generateShort}
                disabled={isGenerating || (!topic.trim() && !customScript.trim())}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors shadow-lg shadow-purple-900/30"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Short
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Result ───────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Resultado</h2>
              {currentShort?.title && (
                <p className="text-sm text-zinc-400">{currentShort.title}</p>
              )}
            </div>

            {!currentShort || (currentShort.status !== 'completed' && currentShort.status !== 'failed') ? (
              /* Loading state */
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                <p className="text-sm text-zinc-300">
                  {currentShort ? (STATUS_LABELS[currentShort.status] ?? 'Processando...') : 'Iniciando...'}
                </p>
                <p className="text-xs text-zinc-600">Isso pode levar alguns minutos</p>
              </div>
            ) : currentShort.status === 'failed' ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
                <p className="text-red-400 font-medium">Geracao falhou</p>
                <p className="text-sm text-zinc-500">Tente novamente com outro topico ou configuracao.</p>
                <button onClick={resetWizard} className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors">
                  Tentar novamente
                </button>
              </div>
            ) : (
              /* Completed */
              <div className="space-y-5">
                {/* Video / Script */}
                {currentShort.video_url ? (
                  <video
                    src={currentShort.video_url}
                    controls
                    className="w-full rounded-xl border border-zinc-800"
                  />
                ) : currentShort.script ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Script</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{currentShort.script}</p>
                  </div>
                ) : null}

                {/* Scenes list if no video */}
                {!currentShort.video_url && Array.isArray(currentShort.scenes) && currentShort.scenes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cenas</p>
                    {currentShort.scenes.map((scene: unknown, i: number) => (
                      <div key={i} className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-400">
                        {typeof scene === 'string' ? scene : JSON.stringify(scene)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Platform tabs */}
                {currentShort.platform_metadata && (
                  <div className="space-y-3">
                    <div className="flex gap-1 border-b border-zinc-800">
                      {(['youtube', 'instagram', 'tiktok'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setPlatformTab(p)}
                          className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px capitalize ${
                            platformTab === p
                              ? 'border-purple-500 text-purple-300'
                              : 'border-transparent text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {p === 'youtube' ? 'YouTube' : p === 'instagram' ? 'Instagram' : 'TikTok'}
                        </button>
                      ))}
                    </div>

                    {currentShort.platform_metadata[platformTab] && (() => {
                      const meta = currentShort.platform_metadata![platformTab]!
                      return (
                        <div className="space-y-3">
                          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-medium">Titulo</span>
                              <CopyButton text={meta.title} />
                            </div>
                            <p className="text-sm text-zinc-200">{meta.title}</p>
                          </div>
                          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-500 font-medium">Descricao</span>
                              <CopyButton text={meta.description} />
                            </div>
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{meta.description}</p>
                          </div>
                          {meta.hashtags?.length > 0 && (
                            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-500 font-medium">Hashtags</span>
                                <CopyButton text={meta.hashtags.join(' ')} />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {meta.hashtags.map((h: string) => (
                                  <span key={h} className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Admin: cost info */}
                {costEstimate?.estimatedCostUsd !== undefined && (
                  <div className="text-xs text-zinc-600 text-right">
                    Custo total: ${costEstimate.estimatedCostUsd.toFixed(4)} USD
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {currentShort?.status === 'completed' && currentShort.video_url && (
                <a
                  href={currentShort.video_url}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium text-white transition-colors"
                >
                  Download
                </a>
              )}
              {shortId && (
                <button
                  onClick={() => deleteShort(shortId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Apagar
                </button>
              )}
              <button
                onClick={resetWizard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Criar Outro
              </button>
            </div>
          </div>
        )}

        {/* ── Gallery ──────────────────────────────────────────────────────────── */}
        <div className="pt-6 border-t border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Shorts anteriores</h3>

          {loadingShorts ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </div>
          ) : shorts.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhum short criado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shorts.map(s => (
                <div
                  key={s.id}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2 cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => openShort(s)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-medium text-zinc-300 leading-snug line-clamp-2 flex-1">
                      {s.title ?? 'Sem titulo'}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); deleteShort(s.id) }}
                      className="shrink-0 p-1 rounded text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <StatusBadge status={s.status} />
                  <div className="flex flex-wrap gap-1">
                    {s.language && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-500">
                        {s.language.toUpperCase()}
                      </span>
                    )}
                    {s.visualMode && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-500">
                        {s.visualMode}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    {new Date(s.createdAt ?? s.created_at ?? Date.now()).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
