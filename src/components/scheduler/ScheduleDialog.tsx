'use client'

import { useState } from 'react'
import {
  X,
  Camera,
  Globe,
  Tv,
  Music,
  AtSign,
  Briefcase,
  MessageCircle,
  Cloud,
  Pin,
  Sparkles,
  Hash,
  Loader2,
  Zap,
  CalendarClock,
  Link2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { ScheduledPost, PostProject } from '@/types/project'
import { saveScheduledPost } from '@/lib/storage'
import { createPost, uploadMediaFromUrl, PROVIDERS, type PostizIntegration } from '@/lib/postiz'

interface Props {
  open: boolean
  onClose: () => void
  projects: PostProject[]
  preselectedDate?: Date | null
  onScheduled?: (post: ScheduledPost) => void
  integrations?: PostizIntegration[]
  apiKey?: string | null
}

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram:  Camera,
  facebook:   Globe,
  youtube:    Tv,
  tiktok:     Music,
  x:          AtSign,
  linkedin:   Briefcase,
  threads:    MessageCircle,
  pinterest:  Pin,
  bluesky:    Cloud,
}

type PublishMode = 'now' | 'schedule' | 'draft'

export function ScheduleDialog({
  open,
  onClose,
  projects,
  preselectedDate,
  onScheduled,
  integrations = [],
  apiKey,
}: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([])
  const [mode, setMode] = useState<PublishMode>('schedule')
  const [scheduledDate, setScheduledDate] = useState(
    preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : '',
  )
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) return null

  const toggleIntegration = (id: string) =>
    setSelectedIntegrationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  const handlePublish = async () => {
    if (selectedIntegrationIds.length === 0) return
    if (mode === 'schedule' && !scheduledDate) return

    setPublishing(true)
    setPublishResult(null)

    try {
      // If the selected project has a thumbnail, upload it first
      let imagePath: string | undefined
      if (selectedProject?.thumbnail_url && apiKey) {
        try {
          const uploaded = await uploadMediaFromUrl(apiKey, selectedProject.thumbnail_url)
          imagePath = uploaded.path
        } catch {
          // Non-fatal: continue without image
        }
      }

      if (apiKey) {
        // Use Postiz API
        const promises = selectedIntegrationIds.map((integrationId) =>
          createPost(apiKey, {
            integrationId,
            content: caption,
            ...(mode === 'schedule' && scheduledDate
              ? { publishDate: new Date(scheduledDate).toISOString() }
              : {}),
            ...(mode === 'draft' ? { type: 'draft' } : {}),
            ...(imagePath ? { image: [{ path: imagePath }] } : {}),
          }),
        )
        await Promise.all(promises)
        setPublishResult({
          ok: true,
          message:
            mode === 'now'
              ? 'Post publicado com sucesso!'
              : mode === 'draft'
              ? 'Rascunho salvo no Postiz.'
              : 'Post agendado com sucesso!',
        })
      } else {
        // Fallback: save locally
        const selectedIntegrations = selectedIntegrationIds
          .map((id) => integrations.find((i) => i.id === id))
          .filter(Boolean) as PostizIntegration[]

        const post: ScheduledPost = {
          id: crypto.randomUUID(),
          project_id: selectedProjectId,
          platforms: selectedIntegrations.map(
            (i) => i.providerIdentifier as ScheduledPost['platforms'][number],
          ),
          scheduled_at:
            mode === 'now'
              ? new Date().toISOString()
              : new Date(scheduledDate).toISOString(),
          status: 'scheduled',
          caption,
          hashtags: [],
        }
        saveScheduledPost(post)
        onScheduled?.(post)
        setPublishResult({ ok: true, message: 'Post salvo localmente.' })
      }

      // Auto-close after short delay on success
      setTimeout(() => {
        setPublishResult(null)
        onClose()
        setSelectedProjectId('')
        setCaption('')
        setSelectedIntegrationIds([])
        setScheduledDate('')
        setMode('schedule')
        setPublishing(false)
      }, 1500)
    } catch (err) {
      setPublishResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erro ao publicar. Tente novamente.',
      })
      setPublishing(false)
    }
  }

  const canSubmit =
    selectedIntegrationIds.length > 0 &&
    (mode === 'now' || mode === 'draft' || !!scheduledDate) &&
    !publishing

  const hasIntegrations = integrations.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold">Agendar Publicacao</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* No integrations CTA */}
          {!hasIntegrations && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm">
              <Link2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-zinc-300 font-medium">Nenhuma conta conectada</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Conecte suas redes sociais para publicar.{' '}
                  <Link
                    href="/settings/connections"
                    className="text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    Configurar agora
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Project selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Projeto da biblioteca</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-green-500/60"
            >
              <option value="">— selecione um projeto —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Legenda</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Escreva a legenda do post…"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCaption((c) => c + '\n\n[IA: sugestao de legenda gerada automaticamente]')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Sugerir com IA
              </button>
              <button
                onClick={() => setCaption((c) => c + '\n\n#hashtag1 #hashtag2 #hashtag3')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                <Hash className="w-3 h-3" />
                Gerar hashtags
              </button>
            </div>
          </div>

          {/* Integration / account selection */}
          {hasIntegrations && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Contas</label>
              <div className="flex flex-wrap gap-2">
                {integrations.map((integration) => {
                  const active = selectedIntegrationIds.includes(integration.id)
                  const info = PROVIDERS[integration.providerIdentifier]
                  const Icon = PROVIDER_ICONS[integration.providerIdentifier] ?? Globe

                  return (
                    <button
                      key={integration.id}
                      onClick={() => toggleIntegration(integration.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                        active
                          ? 'border-green-500/50 bg-green-500/10 text-white'
                          : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      {integration.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={integration.picture}
                          alt={integration.name}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <Icon className={`w-3.5 h-3.5 ${active ? (info?.color ?? '') : ''}`} />
                      )}
                      <span className="max-w-[100px] truncate">{integration.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mode selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Tipo de publicacao</label>
            <div className="flex gap-2">
              {(
                [
                  { id: 'now' as const, label: 'Publicar agora', icon: Zap },
                  { id: 'schedule' as const, label: 'Agendar', icon: CalendarClock },
                  { id: 'draft' as const, label: 'Rascunho', icon: Hash },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors flex-1 justify-center ${
                    mode === id
                      ? 'border-green-500/50 bg-green-500/10 text-white'
                      : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & time (only for schedule mode) */}
          {mode === 'schedule' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Data e horario</label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-green-500/60 [color-scheme:dark]"
              />
            </div>
          )}

          {/* Preview hint */}
          {selectedIntegrationIds.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-500 mb-2">Pre-visualizacao</p>
              {selectedIntegrationIds.map((id) => {
                const integration = integrations.find((i) => i.id === id)
                if (!integration) return null
                const info = PROVIDERS[integration.providerIdentifier]
                const Icon = PROVIDER_ICONS[integration.providerIdentifier] ?? Globe
                return (
                  <div key={id} className="flex items-start gap-2 mb-2 last:mb-0">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${info?.color ?? 'text-zinc-400'}`} />
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 mb-0.5">{integration.name}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {caption
                          ? caption.slice(0, 100) + (caption.length > 100 ? '…' : '')
                          : <span className="text-zinc-600 italic">Sem legenda</span>}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Result feedback */}
          {publishResult && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
              publishResult.ok
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {publishResult.ok
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {publishResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
          >
            {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'now' ? 'Publicar agora' : mode === 'draft' ? 'Salvar rascunho' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
