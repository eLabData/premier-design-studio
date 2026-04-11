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
      return generateMiniMaxTTS(text, language, falKey)
    case 'openai':
      return generateOpenAITTS(text, language, openRouterKey)
    case 'elevenlabs':
      throw new Error('ElevenLabs TTS requires ELEVENLABS_API_KEY — configure in settings')
    default:
      throw new Error(`Unknown TTS provider: ${provider}`)
  }
}

async function generateMiniMaxTTS(
  text: string,
  language: string,
  falKey: string,
): Promise<NarrationResult> {
  // MiniMax Speech-02 HD — 30+ languages, 300+ voices, emotion control
  // PT-BR: use Friendly_Person (neutral, clear) or Inspirational_girl
  // EN: use Calm_Woman or Deep_Voice_Man
  const voiceId = language === 'pt-br' ? 'Friendly_Person' : 'Deep_Voice_Man'

  const response = await fetch('https://fal.run/fal-ai/minimax/speech-02-hd', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_setting: {
        voice_id: voiceId,
        speed: language === 'pt-br' ? 1.1 : 1.0,
        vol: 1.0,
        pitch: 0,
      },
      output_format: 'mp3',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`MiniMax TTS error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const audioUrl = data.audio?.url ?? data.audio_file?.url ?? ''
  const wordCount = text.split(/\s+/).length
  const durationSec = Math.ceil((wordCount / 150) * 60)

  // $0.10 per 1000 chars
  const costUsd = Math.ceil(text.length / 1000) * 0.10

  return { audioUrl, durationSec, costUsd }
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
