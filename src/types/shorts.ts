export type ShortLanguage = 'pt-br' | 'en'
export type ShortFormat = 'short' | 'normal'
export type VisualMode = 'images' | 'video_ai' | 'hybrid'
export type TTSProvider = 'fal_ai' | 'elevenlabs' | 'openai'
export type ShortStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_audio'
  | 'generating_visuals'
  | 'composing'
  | 'completed'
  | 'failed'

export type MotionType = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'none'

export interface ShortScene {
  index: number
  text: string
  imagePrompt: string
  imageUrl?: string
  videoUrl?: string
  motion: MotionType
  durationFrames: number
  startFrame: number
}

export interface PlatformMetadata {
  youtube: { title: string; description: string; tags: string[]; category: string }
  instagram: { caption: string; hashtags: string[] }
  tiktok: { caption: string; hashtags: string[] }
}

export interface CostBreakdown {
  script: number
  tts: number
  images: number
  video_clips: number
  composition: number
  metadata: number
  total: number
}

export interface ShortRecord {
  id: string
  user_id: string
  job_id: string | null
  title: string
  script: string | null
  language: ShortLanguage
  format: ShortFormat
  visual_mode: VisualMode
  tts_provider: TTSProvider
  caption_style: string
  narration_url: string | null
  scenes: ShortScene[]
  video_url: string | null
  thumbnail_url: string | null
  captions: { text: string; startFrame: number; endFrame: number; words?: { word: string; startFrame: number; endFrame: number }[] }[]
  platform_metadata: PlatformMetadata | Record<string, never>
  cost_usd: number
  cost_breakdown: CostBreakdown | Record<string, never>
  credits_charged: number
  status: ShortStatus
  error_message: string | null
  file_size_mb: number
  created_at: string
  completed_at: string | null
}

export interface CreateShortRequest {
  topic: string
  language: ShortLanguage
  format: ShortFormat
  visualMode: VisualMode
  ttsProvider: TTSProvider
  captionStyle?: string
  customScript?: string | null
}

export interface CostEstimate {
  estimatedCostUsd: number
  breakdown: CostBreakdown
  estimatedCredits: number
  estimatedDurationSec: number
}
