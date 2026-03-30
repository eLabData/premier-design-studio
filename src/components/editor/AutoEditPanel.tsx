'use client'

import {
  useState,
  useRef,
  useCallback,
  type ChangeEvent,
} from 'react'
import {
  Wand2,
  Mic,
  Brain,
  Film,
  Layers,
  CheckCircle,
  Check,
  X,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Scissors,
  ImagePlay,
  Captions,
  MessageSquare,
  Download,
} from 'lucide-react'
import { useAutoEdit, type AutoEditStep } from '@/hooks/useAutoEdit'
import { useEditorStore } from '@/lib/stores'
import type { CaptionStyleName } from '@/types/project'

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS: {
  key: AutoEditStep
  label: string
  icon: React.ElementType
  progressRange: [number, number]
}[] = [
  { key: 'transcribing', label: 'Transcrição', icon: Mic, progressRange: [0, 30] },
  { key: 'analyzing', label: 'Análise', icon: Brain, progressRange: [30, 50] },
  { key: 'searching_broll', label: 'B-Roll', icon: Film, progressRange: [50, 70] },
  { key: 'applying', label: 'Aplicando', icon: Layers, progressRange: [70, 95] },
  { key: 'ready', label: 'Pronto', icon: CheckCircle, progressRange: [95, 100] },
]

function stepIndex(step: AutoEditStep): number {
  return STEPS.findIndex((s) => s.key === step)
}

// ── Caption style options ─────────────────────────────────────────────────────

const CAPTION_STYLES: { value: CaptionStyleName; label: string; desc: string }[] =
  [
    { value: 'minimal', label: 'Minimal', desc: 'Texto branco com sombra' },
    { value: 'bold', label: 'Destaque', desc: 'Palavra ativa em verde' },
    { value: 'karaoke', label: 'Karaokê', desc: 'Preenchimento palavra por palavra' },
    { value: 'boxed', label: 'Box', desc: 'Fundo escuro por trás do texto' },
  ]

// ── Panel tabs ────────────────────────────────────────────────────────────────

type PanelTab =
  | 'transcript'
  | 'cortes'
  | 'broll'
  | 'legendas'
  | 'resumo'

// ── Component ─────────────────────────────────────────────────────────────────

interface AutoEditPanelProps {
  onClose?: () => void
}

export function AutoEditPanel({ onClose }: AutoEditPanelProps) {
  const {
    step,
    progress,
    transcript,
    suggestions,
    brollResults,
    error,
    runAutoEdit,
    acceptCut,
    rejectCut,
    acceptBRoll,
    rejectBRoll,
    applyEdits,
  } = useAutoEdit()

  const { project, updateProject } = useEditorStore()
  const [activeTab, setActiveTab] = useState<PanelTab>('transcript')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isRunning =
    step === 'transcribing' ||
    step === 'analyzing' ||
    step === 'searching_broll' ||
    step === 'applying'

  const hasResults = step === 'ready'

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStartClick = useCallback(() => {
    if (project) {
      // If a video is already loaded, get its blob and run
      const mainClip = project.tracks.find((t) => t.type === 'main')?.clips[0]
      if (mainClip) {
        fetch(mainClip.source_url)
          .then((r) => r.blob())
          .then((blob) => {
            const file = new File([blob], project.name + '.mp4', {
              type: 'video/mp4',
            })
            return runAutoEdit(file)
          })
          .catch(console.error)
        return
      }
    }
    // Fallback: ask user to select a file
    fileInputRef.current?.click()
  }, [project, runAutoEdit])

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      runAutoEdit(file)
      e.target.value = ''
    },
    [runAutoEdit]
  )

  const handleApplyAll = useCallback(() => {
    if (!suggestions) return
    applyEdits(suggestions, brollResults)
  }, [suggestions, brollResults, applyEdits])

  const handleCaptionStyleChange = useCallback(
    (style: CaptionStyleName) => {
      updateProject((p) => ({ ...p, captionStyle: style }))
    },
    [updateProject]
  )

  const handleSeek = useCallback(
    (time: number) => {
      useEditorStore.getState().setCurrentTime(time)
    },
    []
  )

  const currentCaptionStyle = project?.captionStyle ?? 'bold'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <Wand2 className="w-4 h-4 text-green-400" />
        <h2 className="text-sm font-semibold flex-1">Editar com IA</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Idle / start state */}
        {step === 'idle' && (
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Edição automática com IA
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                Transcrição, corte de silêncios, B-roll e legendas animadas em
                um clique.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleStartClick}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Editar com IA
            </button>
            {!project && (
              <p className="text-xs text-zinc-600">
                Ou importe um vídeo na toolbar primeiro
              </p>
            )}
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="px-4 py-6 space-y-6">
            {/* Step progress */}
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const currentIdx = stepIndex(step)
                const isDone = i < currentIdx
                const isActive = s.key === step
                const StepIcon = s.icon

                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-3 text-sm transition-colors ${
                      isDone
                        ? 'text-green-400'
                        : isActive
                        ? 'text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        isDone
                          ? 'bg-green-500/20 border-green-500'
                          : isActive
                          ? 'bg-green-500/10 border-green-500'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span>{s.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 ml-auto animate-pulse" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {step === 'error' && (
          <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm font-medium text-red-400">Erro no processamento</p>
            {error && (
              <p className="text-xs text-zinc-500 max-w-[220px]">{error}</p>
            )}
            <button
              onClick={handleStartClick}
              className="mt-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Results state */}
        {hasResults && (
          <div className="flex flex-col">
            {/* Tab bar */}
            <div className="flex border-b border-zinc-800 overflow-x-auto">
              {(
                [
                  { key: 'transcript', label: 'Transcrição', icon: FileText },
                  { key: 'cortes', label: 'Cortes', icon: Scissors },
                  { key: 'broll', label: 'B-Roll', icon: ImagePlay },
                  { key: 'legendas', label: 'Legendas', icon: Captions },
                  { key: 'resumo', label: 'Resumo', icon: MessageSquare },
                ] as { key: PanelTab; label: string; icon: React.ElementType }[]
              ).map((tab) => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-green-500 text-green-400'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content */}
            <div className="px-4 py-4 space-y-3">
              {/* TRANSCRIPT TAB */}
              {activeTab === 'transcript' && transcript && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">
                    {transcript.segments.length} segmentos ·{' '}
                    {transcript.language}
                  </p>
                  {transcript.segments.map((seg, i) => (
                    <button
                      key={i}
                      onClick={() => handleSeek(seg.startTime)}
                      className="w-full text-left p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-green-500 font-mono mt-0.5 flex-shrink-0">
                          {formatTime(seg.startTime)}
                        </span>
                        <p className="text-xs text-zinc-300 group-hover:text-white transition-colors leading-relaxed">
                          {seg.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* CORTES TAB */}
              {activeTab === 'cortes' && suggestions && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">
                    {suggestions.silenceCuts.filter((c) => c.accepted).length} de{' '}
                    {suggestions.silenceCuts.length} cortes ativos
                  </p>
                  {suggestions.silenceCuts.map((cut, i) => (
                    <div
                      key={cut.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        cut.accepted
                          ? 'bg-green-500/5 border-green-500/30'
                          : 'bg-zinc-900 border-zinc-800 opacity-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              cut.type === 'filler'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-zinc-700 text-zinc-400'
                            }`}
                          >
                            {cut.type === 'filler' ? 'Preenchedor' : 'Silêncio'}
                          </span>
                          {cut.fillerWord && (
                            <span className="text-xs text-zinc-500 italic">
                              &quot;{cut.fillerWord}&quot;
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-1">
                          {formatTime(cut.startTime)} →{' '}
                          {formatTime(cut.endTime)}{' '}
                          <span className="text-zinc-600">
                            ({((cut.endTime - cut.startTime) * 1000).toFixed(0)}ms)
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => acceptCut(i)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            cut.accepted
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-800 text-zinc-500 hover:text-green-400'
                          }`}
                          title="Aceitar corte"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => rejectCut(i)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            !cut.accepted
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-zinc-800 text-zinc-500 hover:text-red-400'
                          }`}
                          title="Rejeitar corte"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* B-ROLL TAB */}
              {activeTab === 'broll' && (
                <div className="space-y-3">
                  {brollResults.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      Nenhum B-roll encontrado
                    </p>
                  )}
                  {brollResults.map((broll, i) => (
                    <div
                      key={broll.id}
                      className={`rounded-lg border overflow-hidden transition-colors ${
                        broll.accepted
                          ? 'border-green-500/30'
                          : 'border-zinc-800 opacity-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={broll.thumbnailUrl}
                          alt={broll.keyword}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                              'none'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-xs text-white font-medium truncate">
                            {broll.keyword}
                          </p>
                          <p className="text-xs text-zinc-400 font-mono">
                            {formatTime(broll.startTime)} →{' '}
                            {formatTime(broll.endTime)}
                          </p>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900">
                        <span className="text-xs text-zinc-500 flex-1">
                          Fonte: {broll.source}
                        </span>
                        <button
                          onClick={() =>
                            acceptBRoll(i, broll.videoUrl)
                          }
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            broll.accepted
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-800 text-zinc-400 hover:text-green-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          Usar
                        </button>
                        <button
                          onClick={() => rejectBRoll(i)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            !broll.accepted
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-zinc-800 text-zinc-400 hover:text-red-400'
                          }`}
                        >
                          <X className="w-3 h-3" />
                          Ignorar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LEGENDAS TAB */}
              {activeTab === 'legendas' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-400 font-medium mb-2">
                      Estilo de legenda
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {CAPTION_STYLES.map((cs) => (
                        <button
                          key={cs.value}
                          onClick={() => handleCaptionStyleChange(cs.value)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            currentCaptionStyle === cs.value
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold ${
                              currentCaptionStyle === cs.value
                                ? 'text-green-400'
                                : 'text-zinc-300'
                            }`}
                          >
                            {cs.label}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {cs.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {transcript && (
                    <div>
                      <p className="text-xs text-zinc-400 font-medium mb-2">
                        Pré-visualização ({transcript.segments.length} legendas)
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {transcript.segments.slice(0, 8).map((seg, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs py-1"
                          >
                            <span className="text-zinc-600 font-mono flex-shrink-0">
                              {formatTime(seg.startTime)}
                            </span>
                            <span className="text-zinc-400">{seg.text}</span>
                          </div>
                        ))}
                        {transcript.segments.length > 8 && (
                          <p className="text-xs text-zinc-600 text-center py-1">
                            +{transcript.segments.length - 8} mais…
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* RESUMO TAB */}
              {activeTab === 'resumo' && suggestions && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-400 font-medium mb-2">
                      Resumo do vídeo
                    </p>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                      {suggestions.summary}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 font-medium mb-2">
                      Legenda para redes sociais
                    </p>
                    <div className="relative">
                      <pre className="text-xs text-zinc-300 leading-relaxed bg-zinc-900 rounded-lg p-3 border border-zinc-800 whitespace-pre-wrap font-sans">
                        {suggestions.socialCaption}
                      </pre>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(
                            suggestions.socialCaption
                          )
                        }
                        className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Copiar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {suggestions.highlightMoments.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-400 font-medium mb-2">
                        Momentos em destaque
                      </p>
                      <div className="space-y-2">
                        {suggestions.highlightMoments.map((m, i) => (
                          <button
                            key={i}
                            onClick={() => handleSeek(m.startTime)}
                            className="w-full text-left p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-green-500 font-mono">
                                {formatTime(m.startTime)} → {formatTime(m.endTime)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                              {m.reason}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions — only shown when results are available */}
      {hasResults && (
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-zinc-800">
          <button
            onClick={handleApplyAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
          >
            <Check className="w-4 h-4" />
            Aplicar tudo
          </button>
          <button
            onClick={handleStartClick}
            className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
          >
            Refazer análise
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}
