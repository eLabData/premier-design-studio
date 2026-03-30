'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Globe, Tv, Music, AtSign, Plus } from 'lucide-react'
import { CalendarView } from '@/components/scheduler/CalendarView'
import { PostQueue } from '@/components/scheduler/PostQueue'
import { ScheduleDialog } from '@/components/scheduler/ScheduleDialog'
import { getScheduledPosts, deleteScheduledPost, updateScheduledPost, getProjects } from '@/lib/storage'
import { isSameDay as dateFnsIsSameDay } from 'date-fns'
import type { ScheduledPost, Platform, PostProject } from '@/types/project'

const PLATFORMS: { id: Platform; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Camera, color: 'text-pink-500' },
  { id: 'facebook', label: 'Facebook', icon: Globe, color: 'text-blue-500' },
  { id: 'youtube', label: 'YouTube', icon: Tv, color: 'text-red-500' },
  { id: 'tiktok', label: 'TikTok', icon: Music, color: 'text-cyan-400' },
  { id: 'x', label: 'X', icon: AtSign, color: 'text-white' },
]

export default function SchedulerPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [projects, setProjects] = useState<PostProject[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    setScheduledPosts(getScheduledPosts())
    setProjects(getProjects())
  }, [])

  const togglePlatform = (platform: Platform) =>
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    )

  const filteredPosts = scheduledPosts.filter((post) => {
    const platformMatch =
      selectedPlatforms.length === 0 || post.platforms.some((p) => selectedPlatforms.includes(p))
    const dayMatch = selectedDay ? dateFnsIsSameDay(new Date(post.scheduled_at), selectedDay) : true
    return platformMatch && dayMatch
  })

  const handleCancel = (id: string) => {
    deleteScheduledPost(id)
    setScheduledPosts(getScheduledPosts())
  }

  const handlePublishNow = (id: string) => {
    updateScheduledPost(id, { status: 'publishing' })
    setScheduledPosts(getScheduledPosts())
    // simulate finish
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
        {/* Platform sidebar */}
        <div className="w-56 shrink-0 border-r border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Plataformas
          </h2>
          <div className="space-y-1.5">
            {PLATFORMS.map((p) => {
              const active = selectedPlatforms.includes(p.id)
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    active ? 'border-green-500/40 bg-green-500/10' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => togglePlatform(p.id)}
                    className="accent-green-500"
                  />
                  <p.icon className={`w-4 h-4 ${p.color}`} />
                  <span className="text-sm">{p.label}</span>
                </label>
              )
            })}
          </div>

          {selectedPlatforms.length > 0 && (
            <button
              onClick={() => setSelectedPlatforms([])}
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
                Limpar seleção de dia
              </button>
            )}
          </div>
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
              Fila de Publicação
            </h2>
            <span className="text-xs text-zinc-600">{filteredPosts.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PostQueue
              posts={filteredPosts}
              onCancel={handleCancel}
              onPublishNow={handlePublishNow}
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
      />
    </div>
  )
}
