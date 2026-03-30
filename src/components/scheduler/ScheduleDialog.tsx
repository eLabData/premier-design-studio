'use client'

import { useState } from 'react'
import { X, Camera, Globe, Tv, Music, AtSign, Sparkles, Hash } from 'lucide-react'
import { format } from 'date-fns'
import type { Platform, ScheduledPost, PostProject } from '@/types/project'
import { saveScheduledPost } from '@/lib/storage'

interface Props {
  open: boolean
  onClose: () => void
  projects: PostProject[]
  preselectedDate?: Date | null
  onScheduled?: (post: ScheduledPost) => void
}

const PLATFORMS: { id: Platform; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Camera, color: 'text-pink-400' },
  { id: 'facebook', label: 'Facebook', icon: Globe, color: 'text-blue-400' },
  { id: 'youtube', label: 'YouTube', icon: Tv, color: 'text-red-400' },
  { id: 'tiktok', label: 'TikTok', icon: Music, color: 'text-cyan-400' },
  { id: 'x', label: 'X', icon: AtSign, color: 'text-zinc-200' },
]

export function ScheduleDialog({ open, onClose, projects, preselectedDate, onScheduled }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [caption, setCaption] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [scheduledDate, setScheduledDate] = useState(
    preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : '',
  )

  if (!open) return null

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))

  const handleSchedule = () => {
    if (!scheduledDate || platforms.length === 0) return
    const post: ScheduledPost = {
      id: crypto.randomUUID(),
      project_id: selectedProjectId,
      platforms,
      scheduled_at: new Date(scheduledDate).toISOString(),
      status: 'scheduled',
      caption,
      hashtags: [],
    }
    saveScheduledPost(post)
    onScheduled?.(post)
    onClose()
    // reset
    setSelectedProjectId('')
    setCaption('')
    setPlatforms([])
    setScheduledDate('')
  }

  const canSubmit = platforms.length > 0 && !!scheduledDate

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-base font-semibold">Agendar Publicação</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
                onClick={() => setCaption((c) => c + '\n\n[IA: sugestão de legenda gerada automaticamente]')}
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

          {/* Platform selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Plataformas</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ id, label, icon: Icon, color }) => {
                const active = platforms.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => togglePlatform(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                      active
                        ? 'border-green-500/50 bg-green-500/10 text-white'
                        : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? color : ''}`} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date & time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Data e horário</label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:border-green-500/60 [color-scheme:dark]"
            />
          </div>

          {/* Preview hint */}
          {platforms.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-500 mb-2">Pré-visualização por plataforma</p>
              {platforms.map((p) => (
                <div key={p} className="flex items-start gap-2 mb-2 last:mb-0">
                  {(() => {
                    const { icon: Icon, color } = PLATFORMS.find((x) => x.id === p)!
                    return <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                  })()}
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {caption ? caption.slice(0, 100) + (caption.length > 100 ? '…' : '') : <span className="text-zinc-600 italic">Sem legenda</span>}
                  </p>
                </div>
              ))}
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
            onClick={handleSchedule}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            Agendar
          </button>
        </div>
      </div>
    </div>
  )
}
