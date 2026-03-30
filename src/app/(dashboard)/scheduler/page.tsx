'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Camera,
  Globe,
  Tv,
  Music,
  AtSign,
  Briefcase,
  MessageCircle,
  Cloud,
  Pin,
  Link2,
} from 'lucide-react'
import { CalendarView } from '@/components/scheduler/CalendarView'
import { PostQueue } from '@/components/scheduler/PostQueue'
import { ScheduleDialog } from '@/components/scheduler/ScheduleDialog'
import { getScheduledPosts, deleteScheduledPost, updateScheduledPost, getProjects } from '@/lib/storage'
import { isSameDay as dateFnsIsSameDay } from 'date-fns'
import type { ScheduledPost, PostProject } from '@/types/project'
import { usePostiz } from '@/hooks/usePostiz'
import { PROVIDERS, type PostizIntegration } from '@/lib/postiz'

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

export default function SchedulerPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<string[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [projects, setProjects] = useState<PostProject[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  const { integrations, loading: integrationsLoading, isConnected, apiKey } = usePostiz()

  useEffect(() => {
    setScheduledPosts(getScheduledPosts())
    setProjects(getProjects())
  }, [])

  const toggleIntegration = (id: string) =>
    setSelectedIntegrationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  // Filter local scheduled posts by selected integrations (matched via platform name) and day
  const filteredPosts = scheduledPosts.filter((post) => {
    const dayMatch = selectedDay ? dateFnsIsSameDay(new Date(post.scheduled_at), selectedDay) : true
    // When integrations are selected, filter by matching platform identifier
    if (selectedIntegrationIds.length > 0) {
      const selectedProviders = selectedIntegrationIds
        .map((id) => integrations.find((i) => i.id === id)?.providerIdentifier)
        .filter(Boolean) as string[]
      const platformMatch = post.platforms.some((p) => selectedProviders.includes(p))
      return platformMatch && dayMatch
    }
    return dayMatch
  })

  const handleCancel = (id: string) => {
    deleteScheduledPost(id)
    setScheduledPosts(getScheduledPosts())
  }

  const handlePublishNow = (id: string) => {
    updateScheduledPost(id, { status: 'publishing' })
    setScheduledPosts(getScheduledPosts())
    setTimeout(() => {
      updateScheduledPost(id, { status: 'published' })
      setScheduledPosts(getScheduledPosts())
    }, 2000)
  }

  const handleScheduled = () => {
    setScheduledPosts(getScheduledPosts())
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Agendador</h1>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar Post
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Integrations sidebar */}
        <div className="w-56 shrink-0 border-r border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Contas conectadas
          </h2>

          {!apiKey ? (
            // No API key configured
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Conecte suas redes sociais para agendar posts.
              </p>
              <Link
                href="/settings/connections"
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Conectar contas
              </Link>
            </div>
          ) : integrationsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : !isConnected ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Nenhuma conta conectada ainda.
              </p>
              <Link
                href="/settings/connections"
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Adicionar conta
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {integrations.map((integration) => {
                const active = selectedIntegrationIds.includes(integration.id)
                const info = PROVIDERS[integration.providerIdentifier]
                const Icon = PROVIDER_ICONS[integration.providerIdentifier] ?? Globe

                return (
                  <label
                    key={integration.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      active
                        ? 'border-green-500/40 bg-green-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleIntegration(integration.id)}
                      className="accent-green-500 shrink-0"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      {integration.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={integration.picture}
                          alt={integration.name}
                          className="w-5 h-5 rounded-full border border-zinc-700 object-cover shrink-0"
                        />
                      ) : (
                        <Icon className={`w-4 h-4 shrink-0 ${info?.color ?? 'text-zinc-400'}`} />
                      )}
                      <span className="text-xs truncate">{integration.name}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {selectedIntegrationIds.length > 0 && (
            <button
              onClick={() => setSelectedIntegrationIds([])}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Limpar filtros
            </button>
          )}

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 mb-2">Filtrar por dia</p>
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                Limpar selecao de dia
              </button>
            )}
          </div>

          {apiKey && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <Link
                href="/settings/connections"
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Gerenciar contas
              </Link>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="flex-1 p-6 overflow-hidden">
          <CalendarView
            currentMonth={currentMonth}
            scheduledPosts={scheduledPosts}
            selectedDay={selectedDay}
            onDayClick={(day) => setSelectedDay((prev) => (prev && dateFnsIsSameDay(prev, day) ? null : day))}
            onMonthChange={setCurrentMonth}
          />
        </div>

        {/* Queue */}
        <div className="w-72 shrink-0 border-l border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Fila de Publicacao
            </h2>
            <span className="text-xs text-zinc-600">{filteredPosts.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PostQueue
              posts={filteredPosts}
              onCancel={handleCancel}
              onPublishNow={handlePublishNow}
              integrations={integrations}
            />
          </div>
        </div>
      </div>

      <ScheduleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projects={projects}
        preselectedDate={selectedDay}
        onScheduled={handleScheduled}
        integrations={integrations}
        apiKey={apiKey}
      />
    </div>
  )
}
