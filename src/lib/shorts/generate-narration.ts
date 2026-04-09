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
      return generateFalTTS(text, language, falKey)
    case 'openai':
      return generateOpenAITTS(text, language, openRouterKey)
    case 'elevenlabs':
      throw new Error('ElevenLabs TTS requires ELEVENLABS_API_KEY — configure in settings')
    default:
      throw new Error(`Unknown TTS provider: ${provider}`)
  }
}

async function generateFalTTS(
  text: string,
  language: string,
  falKey: string,
): Promise<NarrationResult> {
  const response = await fetch('https://fal.run/fal-ai/f5-tts', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gen_text: text,
      ref_audio_url: 'https://github.com/SWivid/F5-TTS/raw/refs/heads/main/tests/ref_audio/test_en_1_ref_short.wav',
      model_type: 'F5-TTS',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`fal.ai TTS error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const audioUrl = data.audio_url?.url ?? data.audio_url ?? ''
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
