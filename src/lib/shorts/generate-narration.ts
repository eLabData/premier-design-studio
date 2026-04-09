import type { TTSProvider } from '@/types/shorts'

interface NarrationResult {
  audioUrl: string
  durationSec: number
  costUsd: number
}

export async function generateNarration(
  text: string,
  provider: TTSProvider,
  language: string,
  falKey: string,
  openRouterKey: string,
): Promise<NarrationResult> {
  switch (provider) {
    case 'fal_ai':
      return generateInworldTTS(text, language, falKey)
    case 'openai':
      return generateOpenAITTS(text, language, openRouterKey)
    case 'elevenlabs':
      throw new Error('ElevenLabs TTS requires ELEVENLABS_API_KEY — configure in settings')
    default:
      throw new Error(`Unknown TTS provider: ${provider}`)
  }
}

async function generateInworldTTS(
  text: string,
  language: string,
  falKey: string,
): Promise<NarrationResult> {
  // Inworld TTS — fast, no reference audio needed
  const voice = language === 'pt-br' ? 'Celeste (en)' : 'Hank (en)'

  const response = await fetch('https://fal.run/fal-ai/inworld-tts', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`fal.ai TTS error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const audioUrl = data.audio?.url ?? ''
  const wordCount = text.split(/\s+/).length
  const durationSec = Math.ceil((wordCount / 150) * 60)

  return { audioUrl, durationSec, costUsd: 0.02 }
}

async function generateOpenAITTS(
  text: string,
  language: string,
  openRouterKey: string,
): Promise<NarrationResult> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: language === 'pt-br' ? 'nova' : 'onyx',
      response_format: 'mp3',
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI TTS error ${response.status}`)
  }

  const audioBlob = await response.blob()
  const wordCount = text.split(/\s+/).length
  const durationSec = Math.ceil((wordCount / 150) * 60)

  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const audioUrl = `data:audio/mp3;base64,${base64}`

  return { audioUrl, durationSec, costUsd: 0.015 }
}
