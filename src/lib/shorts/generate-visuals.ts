import type { ShortScene, VisualMode, ShortFormat } from '@/types/shorts'
import { IMAGE_COST_PER_SCENE, VIDEO_CLIP_COST_PER_SCENE } from '@/lib/shorts-config'

interface VisualsResult {
  scenes: ShortScene[]
  costUsd: number
}

export async function generateVisuals(
  scenes: ShortScene[],
  visualMode: VisualMode,
  format: ShortFormat,
  falKey: string,
): Promise<VisualsResult> {
  let totalCost = 0
  const updatedScenes = [...scenes]
  const size = format === 'short'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 }

  for (let i = 0; i < updatedScenes.length; i++) {
    const scene = updatedScenes[i]
    const useVideo = shouldUseVideo(i, updatedScenes.length, visualMode)

    if (useVideo) {
      const imageUrl = await generateImage(scene.imagePrompt, size, falKey)
      updatedScenes[i] = { ...scene, imageUrl, videoUrl: undefined }
      totalCost += IMAGE_COST_PER_SCENE + VIDEO_CLIP_COST_PER_SCENE
    } else {
      const imageUrl = await generateImage(scene.imagePrompt, size, falKey)
      updatedScenes[i] = { ...scene, imageUrl }
      totalCost += IMAGE_COST_PER_SCENE
    }
  }

  return { scenes: updatedScenes, costUsd: totalCost }
}

function shouldUseVideo(index: number, total: number, mode: VisualMode): boolean {
  if (mode === 'images') return false
  if (mode === 'video_ai') return true
  return index >= Math.ceil(total * 0.6)
}

async function generateImage(
  prompt: string,
  size: { width: number; height: number },
  falKey: string,
): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${prompt}. Photorealistic, cinematic lighting, 8k quality. Do NOT include any text, words, or letters in the image.`,
      image_size: { width: size.width, height: size.height },
      num_images: 1,
      output_format: 'jpeg',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`FLUX Schnell error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.images?.[0]?.url ?? ''
}
