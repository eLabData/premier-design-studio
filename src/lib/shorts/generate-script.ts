import type { ShortLanguage, ShortFormat, ShortScene } from '@/types/shorts'

interface ScriptResult {
  title: string
  scenes: Array<{
    narration: string
    imagePrompt: string
    motion: string
  }>
  fullScript: string
}

const SYSTEM_PROMPT = `You are a viral short-form video scriptwriter. You create compelling, hook-driven scripts.
Rules:
- First scene MUST have a strong hook (question, surprising fact, bold claim)
- 5-8 scenes total
- Each scene narration: 15-20 words, conversational tone
- Image prompts: specific, cinematic, photorealistic, no text in images
- End with call-to-action or thought-provoking conclusion
- Total narration should fit in the requested duration when spoken
- Output ONLY valid JSON, no markdown code fences`

export async function generateScript(
  topic: string,
  language: ShortLanguage,
  format: ShortFormat,
  apiKey: string,
): Promise<ScriptResult> {
  const duration = format === 'short' ? 35 : 90
  const langLabel = language === 'pt-br' ? 'Brazilian Portuguese' : 'English'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studio.elabdata.com.br',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a script for a ${duration}s ${format === 'short' ? 'vertical short' : 'landscape YouTube video'} about: "${topic}".
Language: ${langLabel}
Output JSON: { "title": "catchy title under 60 chars", "scenes": [{ "narration": "text to speak", "imagePrompt": "detailed image prompt", "motion": "zoom-in|zoom-out|pan-left|pan-right|ken-burns" }] }`,
        },
      ],
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content ?? '{}'
  // Strip markdown code fences if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) content = jsonMatch[1].trim()
  // Also try to extract raw JSON object
  if (!content.startsWith('{')) {
    const objMatch = content.match(/\{[\s\S]*\}/)
    if (objMatch) content = objMatch[0]
  }
  const parsed = JSON.parse(content) as {
    title: string
    scenes: Array<{ narration: string; imagePrompt: string; motion: string }>
  }

  const fullScript = parsed.scenes.map((s) => s.narration).join(' ')

  return { title: parsed.title, scenes: parsed.scenes, fullScript }
}

export function scenesToShortScenes(
  rawScenes: ScriptResult['scenes'],
  fps: number,
  totalDurationSec: number,
): ShortScene[] {
  const totalFrames = totalDurationSec * fps
  const framesPerScene = Math.floor(totalFrames / rawScenes.length)

  return rawScenes.map((scene, i) => ({
    index: i,
    text: scene.narration,
    imagePrompt: scene.imagePrompt,
    motion: scene.motion as ShortScene['motion'],
    durationFrames: framesPerScene,
    startFrame: i * framesPerScene,
  }))
}
