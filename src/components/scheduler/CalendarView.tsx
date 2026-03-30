'use client'

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ScheduledPost } from '@/types/project'

interface Props {
  currentMonth: Date
  scheduledPosts: ScheduledPost[]
  selectedDay: Date | null
  onDayClick: (day: Date) => void
  onMonthChange: (date: Date) => void
}

const STATUS_COLORS: Record<ScheduledPost['status'], string> = {
  scheduled: 'bg-blue-400',
  publishing: 'bg-yellow-400',
  published: 'bg-green-400',
  failed: 'bg-red-400',
}

export function CalendarView({ currentMonth, scheduledPosts, selectedDay, onDayClick, onMonthChange }: Props) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const postsForDay = (day: Date) =>
    scheduledPosts.filter((p) => isSameDay(new Date(p.scheduled_at), day))

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden h-full flex flex-col">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {weekDays.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-zinc-800">
        {days.map((day) => {
          const posts = postsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const todayDay = isToday(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`relative p-2 text-left transition-colors min-h-[80px] ${
                isSelected
                  ? 'bg-green-500/10'
                  : 'hover:bg-zinc-800/50'
              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                  todayDay
                    ? 'bg-green-500 text-black'
                    : isSelected
                    ? 'text-green-400'
                    : 'text-zinc-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              {/* Post dots */}
              {posts.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {posts.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_COLORS[p.status]}`}
                    />
                  ))}
                  {posts.length > 3 && (
                    <span className="text-[9px] text-zinc-500">+{posts.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-zinc-800 flex items-center gap-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const labels: Record<string, string> = {
            scheduled: 'Agendado',
            publishing: 'Publicando',
            published: 'Publicado',
            failed: 'Falhou',
          }
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] text-zinc-500">{labels[status]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
