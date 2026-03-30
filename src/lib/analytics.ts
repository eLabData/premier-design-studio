/**
 * Rastreamento de uso e custo de IA — armazenado em localStorage.
 * Compativel com futura migracao para Supabase (userId pronto).
 */

import type { UsageEvent, VideoProcessingSession, AIModule, AIProvider } from '@/types/ai'

const EVENTS_KEY = 'pds_usage_events'
const SESSIONS_KEY = 'pds_sessions'

// ── Utilitarios ───────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function readJson<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isClient()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage cheio ou bloqueado — ignora silenciosamente
  }
}

// ── Eventos de Uso ────────────────────────────────────────────────────────────

export function trackUsage(
  event: Omit<UsageEvent, 'id' | 'timestamp'>
): UsageEvent {
  const full: UsageEvent = {
    ...event,
    id: generateId(),
    timestamp: new Date().toISOString(),
  }

  const all = getAllEvents()
  all.push(full)
  writeJson(EVENTS_KEY, all)

  return full
}

export function getAllEvents(): UsageEvent[] {
  return readJson<UsageEvent[]>(EVENTS_KEY, [])
}

export function getEventsByModule(module: AIModule): UsageEvent[] {
  return getAllEvents().filter((e) => e.module === module)
}

export function getEventsByUser(userId: string): UsageEvent[] {
  return getAllEvents().filter((e) => e.userId === userId)
}

// ── Sessoes de Processamento ──────────────────────────────────────────────────

export function startSession(
  userId: string,
  videoDurationSec: number,
  fileSizeMb: number
): VideoProcessingSession {
  const session: VideoProcessingSession = {
    id: generateId(),
    userId,
    startedAt: new Date().toISOString(),
    videoDurationSec,
    fileSizeMb,
    totalCost: 0,
    events: [],
    status: 'processing',
  }

  const all = getAllSessions()
  all.push(session)
  writeJson(SESSIONS_KEY, all)

  return session
}

export function endSession(sessionId: string): void {
  const all = getAllSessions()
  const idx = all.findIndex((s) => s.id === sessionId)
  if (idx < 0) return

  const session = all[idx]
  const cost = getSessionCost(sessionId)

  all[idx] = {
    ...session,
    completedAt: new Date().toISOString(),
    totalCost: cost,
    status: 'completed',
  }

  writeJson(SESSIONS_KEY, all)
}

export function failSession(sessionId: string): void {
  const all = getAllSessions()
  const idx = all.findIndex((s) => s.id === sessionId)
  if (idx < 0) return

  all[idx] = {
    ...all[idx],
    completedAt: new Date().toISOString(),
    status: 'failed',
  }

  writeJson(SESSIONS_KEY, all)
}

export function addEventToSession(sessionId: string, eventId: string): void {
  const all = getAllSessions()
  const idx = all.findIndex((s) => s.id === sessionId)
  if (idx < 0) return

  all[idx] = {
    ...all[idx],
    events: [...all[idx].events, eventId],
  }

  writeJson(SESSIONS_KEY, all)
}

export function getAllSessions(): VideoProcessingSession[] {
  return readJson<VideoProcessingSession[]>(SESSIONS_KEY, [])
}

export function getSessionCost(sessionId: string): number {
  const session = getAllSessions().find((s) => s.id === sessionId)
  if (!session) return 0

  const allEvents = getAllEvents()
  return session.events.reduce((total, eventId) => {
    const event = allEvents.find((e) => e.id === eventId)
    return total + (event?.cost ?? 0)
  }, 0)
}

// ── Agregacoes ────────────────────────────────────────────────────────────────

export function getTotalCost(): number {
  return getAllEvents().reduce((acc, e) => acc + e.cost, 0)
}

export function getCostByModule(): Record<string, number> {
  return getAllEvents().reduce<Record<string, number>>((acc, e) => {
    acc[e.module] = (acc[e.module] ?? 0) + e.cost
    return acc
  }, {})
}

export function getCostByModel(): Record<string, number> {
  return getAllEvents().reduce<Record<string, number>>((acc, e) => {
    acc[e.model] = (acc[e.model] ?? 0) + e.cost
    return acc
  }, {})
}

export function getCostByUser(): Record<string, number> {
  return getAllEvents().reduce<Record<string, number>>((acc, e) => {
    acc[e.userId] = (acc[e.userId] ?? 0) + e.cost
    return acc
  }, {})
}

export function getAverageVideoProcessingCost(): number {
  const completed = getAllSessions().filter((s) => s.status === 'completed')
  if (completed.length === 0) return 0
  const total = completed.reduce((acc, s) => acc + s.totalCost, 0)
  return total / completed.length
}

/**
 * Retorna o tempo medio de processamento de video em minutos,
 * calculado a partir das sessoes concluidas.
 */
export function getAverageEditingTime(): number {
  const completed = getAllSessions().filter(
    (s) => s.status === 'completed' && s.completedAt
  )
  if (completed.length === 0) return 0

  const totalMs = completed.reduce((acc, s) => {
    const start = new Date(s.startedAt).getTime()
    const end = new Date(s.completedAt!).getTime()
    return acc + (end - start)
  }, 0)

  return totalMs / completed.length / 60_000
}

export function clearAnalytics(): void {
  if (!isClient()) return
  localStorage.removeItem(EVENTS_KEY)
  localStorage.removeItem(SESSIONS_KEY)
}

// ── Helper combinado: rastrear + vincular a sessao ────────────────────────────

export function trackAndLink(
  sessionId: string | null,
  event: Omit<UsageEvent, 'id' | 'timestamp'>
): UsageEvent {
  const recorded = trackUsage(event)
  if (sessionId) addEventToSession(sessionId, recorded.id)
  return recorded
}

// ── Tipos re-exportados para conveniencia ─────────────────────────────────────

export type { AIModule, AIProvider }
