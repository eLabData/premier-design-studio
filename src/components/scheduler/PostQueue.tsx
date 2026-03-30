'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Camera, Globe, Tv, Music, AtSign, Pencil, Clock, X, Zap } from 'lucide-react'
import type { ScheduledPost, Platform } from '@/types/project'

interface Props {
  posts: ScheduledPost[]
  onEdit?: (id: string) => void
  onReschedule?: (id: string) => void
  onCancel?: (id: string) => void
  onPublishNow?: (id: string) => void
}

const PLATFORM_ICONS: Record<Platform, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  facebook: Globe,
  youtube: Tv,
  tiktok: Music,
  x: AtSign,
}

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  youtube: 'text-red-400',
  tiktok: 'text-cyan-400',
  x: 'text-zinc-200',
}

const STATUS_BADGES: Record<ScheduledPost['status'], { label: string; class: string }> = {
  scheduled: { label: 'Agendado', class: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  publishing: { label: 'Publicando…', class: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  published: { label: 'Publicado', class: 'bg-green-500/15 text-green-400 border-green-500/30' },
  failed: { label: 'Falhou', class: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function PostQueue({ posts, onEdit, onReschedule, onCancel, onPublishNow }: Props) {
  if (posts.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-600 text-sm">
        Nenhuma publicação agendada.
      </div>
    )
  }

  const sorted = [...posts].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  )

  return (
    <div className="space-y-2">
      {sorted.map((post) => {
        const badge = STATUS_BADGES[post.status]
        const scheduledDate = new Date(post.scheduled_at)

        return (
          <div
            key={post.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2.5"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {post.caption || <span className="text-zinc-600 italic">Sem legenda</span>}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${badge.class}`}>
                {badge.label}
              </span>
            </div>

            {/* Platforms */}
            <div className="flex items-center gap-1.5">
              {post.platforms.map((platform) => {
                const Icon = PLATFORM_ICONS[platform]
                return <Icon key={platform} className={`w-3.5 h-3.5 ${PLATFORM_COLORS[platform]}`} />
              })}
            </div>

            {/* Date */}
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Clock className="w-3 h-3" />
              {format(scheduledDate, "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 pt-0.5">
              {onEdit && (
                <button
                  onClick={() => onEdit(post.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </button>
              )}
              {onReschedule && post.status === 'scheduled' && (
                <button
                  onClick={() => onReschedule(post.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  Reagendar
                </button>
              )}
              {onPublishNow && post.status === 'scheduled' && (
                <button
                  onClick={() => onPublishNow(post.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Publicar agora
                </button>
              )}
              {onCancel && post.status === 'scheduled' && (
                <button
                  onClick={() => onCancel(post.id)}
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
