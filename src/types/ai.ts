/**
 * Tipos de IA especificos ao cliente OpenRouter, analytics e integracao de APIs.
 * Tipos de transcricao e sugestoes de edicao estao em @/types/project.
 */

// ── OpenRouter / API ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatMessageContent[]
}

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' }
}

export interface ChatCompletionOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: 'json_object' | 'text' }
  stream?: boolean
}

export interface ChatCompletionResponse {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
}

export interface UsageStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  callCount: number
}

// ── Resultados de B-Roll da Pexels ────────────────────────────────────────────

/** Resultado de busca de B-roll retornado por searchBRoll() */
export interface PexelsBRollResult {
  url: string
  thumbnail: string
  width: number
  height: number
  duration: number
  keyword: string
}

/** Copia para publicacao em redes sociais */
export interface PostCopy {
  text: string
  hashtags: string[]
  callToAction: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AIModule =
  | 'transcription'
  | 'analysis'
  | 'broll_search'
  | 'caption_gen'
  | 'post_copy'
  | 'video_render'
  | 'logo_gen'
  | 'mockup_gen'
  | 'store_assets'

export type AIProvider = 'openrouter' | 'openai_direct' | 'pexels' | 'local'

export interface UsageEvent {
  id: string
  timestamp: string
  userId: string
  module: AIModule
  model: string
  provider: AIProvider
  inputTokens: number
  outputTokens: number
  cost: number
  durationMs: number
  metadata?: Record<string, unknown>
}

export interface VideoProcessingSession {
  id: string
  userId: string
  startedAt: string
  completedAt?: string
  videoDurationSec: number
  fileSizeMb: number
  totalCost: number
  events: string[]
  status: 'processing' | 'completed' | 'failed'
}
