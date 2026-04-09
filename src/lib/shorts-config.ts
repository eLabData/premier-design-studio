import type { VisualMode, TTSProvider } from '@/types/shorts'

export const SUPER_ADMIN_EMAIL = 'rafael@elabdata.com.br'

export const TTS_COSTS: Record<TTSProvider, number> = {
  fal_ai: 0.02,
  elevenlabs: 0.08,
  openai: 0.015,
}

export const IMAGE_COST_PER_SCENE = 0.003
export const VIDEO_CLIP_COST_PER_SCENE = 0.80
export const SCRIPT_COST = 0.01
export const METADATA_COST = 0.005

export function estimateCost(
  visualMode: VisualMode,
  ttsProvider: TTSProvider,
  sceneCount: number,
): { costUsd: number; breakdown: Record<string, number> } {
  const ttsCost = TTS_COSTS[ttsProvider]
  let imagesCost = 0
  let videoClipsCost = 0

  if (visualMode === 'images') {
    imagesCost = sceneCount * IMAGE_COST_PER_SCENE
  } else if (visualMode === 'video_ai') {
    videoClipsCost = sceneCount * VIDEO_CLIP_COST_PER_SCENE
  } else {
    const imgScenes = Math.ceil(sceneCount * 0.6)
    const vidScenes = sceneCount - imgScenes
    imagesCost = imgScenes * IMAGE_COST_PER_SCENE
    videoClipsCost = vidScenes * VIDEO_CLIP_COST_PER_SCENE
  }

  const breakdown = {
    script: SCRIPT_COST,
    tts: ttsCost,
    images: imagesCost,
    video_clips: videoClipsCost,
    composition: 0,
    metadata: METADATA_COST,
    total: SCRIPT_COST + ttsCost + imagesCost + videoClipsCost + METADATA_COST,
  }

  return { costUsd: breakdown.total, breakdown }
}

export function costToCredits(costUsd: number): number {
  return Math.max(1, Math.ceil(costUsd / 0.05))
}
