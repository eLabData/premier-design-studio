/**
 * Cliente unificado OpenRouter — redireciona para todos os modelos de IA
 * via API compativel com OpenAI em https://openrouter.ai/api/v1
 */

import type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  UsageStats,
} from '@/types/ai'

// ── Modelos disponíveis ───────────────────────────────────────────────────────

export const MODELS = {
  // Texto / Analise
  CLAUDE_SONNET: 'anthropic/claude-sonnet-4',
  CLAUDE_HAIKU: 'anthropic/claude-haiku-4-5-20251001',
  GPT4O_MINI: 'openai/gpt-4o-mini',
  LLAMA_70B: 'meta-llama/llama-3.3-70b-instruct',

  // Visao
  CLAUDE_VISION: 'anthropic/claude-sonnet-4',
  GPT4O_VISION: 'openai/gpt-4o',

  // Transcricao
  WHISPER: 'openai/whisper-large-v3',
} as const

export type ModelId = (typeof MODELS)[keyof typeof MODELS]

// Custo aproximado por 1K tokens (entrada/saida) em USD
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'anthropic/claude-sonnet-4': { input: 0.003, output: 0.015 },
  'anthropic/claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  'meta-llama/llama-3.3-70b-instruct': { input: 0.0004, output: 0.0004 },
}

// ── Rastreamento de uso na sessao ─────────────────────────────────────────────

const sessionStats: UsageStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  callCount: 0,
}

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COSTS[model]
  if (!rates) return 0
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}

function recordUsage(model: string, inputTokens: number, outputTokens: number): void {
  sessionStats.totalInputTokens += inputTokens
  sessionStats.totalOutputTokens += outputTokens
  sessionStats.totalCost += calcCost(model, inputTokens, outputTokens)
  sessionStats.callCount += 1
}

export function getUsageStats(): UsageStats {
  return { ...sessionStats }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getApiKey(): string {
  // Suporta tanto variavel publica (cliente) quanto privada (servidor)
  const key =
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? ''
  if (!key) {
    throw new Error(
      'Chave de API do OpenRouter nao configurada. ' +
        'Defina NEXT_PUBLIC_OPENROUTER_API_KEY no arquivo .env.local.'
    )
  }
  return key
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

// ── Chat Completion ───────────────────────────────────────────────────────────

export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResponse> {
  const apiKey = getApiKey()

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
  }

  if (options.maxTokens) body.max_tokens = options.maxTokens
  if (options.responseFormat) body.response_format = options.responseFormat

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Cabecalhos recomendados pelo OpenRouter para rastreamento
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
      'X-Title': 'Premier Design Studio',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter erro ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
    model: string
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  const content = data.choices[0]?.message?.content ?? ''
  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  const cost = calcCost(model, inputTokens, outputTokens)

  recordUsage(model, inputTokens, outputTokens)

  return { content, model: data.model ?? model, inputTokens, outputTokens, cost }
}

// ── Streaming Completion ──────────────────────────────────────────────────────

export async function* streamCompletion(
  model: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncGenerator<string, ChatCompletionResponse, unknown> {
  const apiKey = getApiKey()

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.3,
  }

  if (options.maxTokens) body.max_tokens = options.maxTokens

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
      'X-Title': 'Premier Design Studio',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter erro ${res.status}: ${errorText}`)
  }

  if (!res.body) throw new Error('Resposta de streaming vazia')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

      for (const line of lines) {
        const jsonStr = line.slice(6)
        if (jsonStr === '[DONE]') continue
        try {
          const parsed = JSON.parse(jsonStr) as {
            choices: { delta?: { content?: string } }[]
          }
          const delta = parsed.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullContent += delta
            yield delta
          }
        } catch {
          // ignora linhas mal-formadas
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Estimativa de tokens para streaming (API nao retorna contagem exata)
  const estimatedInput = messages.reduce((acc, m) => {
    const text = Array.isArray(m.content)
      ? m.content.map((c) => ('text' in c ? (c.text ?? '') : '')).join('')
      : m.content
    return acc + Math.ceil(text.length / 4)
  }, 0)
  const estimatedOutput = Math.ceil(fullContent.length / 4)

  recordUsage(model, estimatedInput, estimatedOutput)

  return {
    content: fullContent,
    model,
    inputTokens: estimatedInput,
    outputTokens: estimatedOutput,
    cost: calcCost(model, estimatedInput, estimatedOutput),
  }
}

// ── Transcricao de Audio ──────────────────────────────────────────────────────

/**
 * Envia um blob de audio para transcricao via Whisper.
 * Usa OpenAI diretamente se OPENAI_API_KEY estiver definida,
 * pois o OpenRouter nao suporta uploads de audio binario.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY

  if (openaiKey) {
    return _transcribeOpenAI(audioBlob, openaiKey)
  }

  // Fallback: AssemblyAI se configurado
  const assemblyKey =
    process.env.ASSEMBLYAI_API_KEY ?? process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY

  if (assemblyKey) {
    return _transcribeAssemblyAI(audioBlob, assemblyKey)
  }

  throw new Error(
    'Nenhuma chave de transcricao configurada. ' +
      'Defina OPENAI_API_KEY ou ASSEMBLYAI_API_KEY no arquivo .env.local.'
  )
}

async function _transcribeOpenAI(audioBlob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')
  formData.append('timestamp_granularities[]', 'segment')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI Whisper erro ${res.status}: ${errorText}`)
  }

  const data = (await res.json()) as { text: string }
  return data.text ?? ''
}

async function _transcribeAssemblyAI(audioBlob: Blob, apiKey: string): Promise<string> {
  // 1. Faz upload do audio
  const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: { authorization: apiKey, 'Transfer-Encoding': 'chunked' },
    body: audioBlob,
  })

  if (!uploadRes.ok) {
    throw new Error(`AssemblyAI upload erro ${uploadRes.status}`)
  }

  const { upload_url } = (await uploadRes.json()) as { upload_url: string }

  // 2. Solicita transcricao
  const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: upload_url, language_detection: true }),
  })

  if (!transcriptRes.ok) {
    throw new Error(`AssemblyAI transcript erro ${transcriptRes.status}`)
  }

  const { id } = (await transcriptRes.json()) as { id: string }

  // 3. Polling ate concluir
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 3000))

    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })

    const result = (await pollRes.json()) as {
      status: string
      text?: string
      error?: string
    }

    if (result.status === 'completed') return result.text ?? ''
    if (result.status === 'error') {
      throw new Error(`AssemblyAI erro de transcricao: ${result.error}`)
    }
  }

  throw new Error('AssemblyAI: tempo limite de transcricao atingido')
}

// ── Transcricao com timestamps (OpenAI verbose_json) ─────────────────────────

export interface WhisperVerboseResponse {
  text: string
  language: string
  duration: number
  segments: {
    text: string
    start: number
    end: number
    words?: { word: string; start: number; end: number }[]
  }[]
}

/**
 * Versao completa de transcricao que retorna segmentos com timestamps.
 * Requer OPENAI_API_KEY — usa Whisper diretamente.
 */
export async function transcribeAudioVerbose(audioBlob: Blob): Promise<WhisperVerboseResponse> {
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY

  if (!openaiKey) {
    throw new Error(
      'OPENAI_API_KEY necessaria para transcricao detalhada com timestamps.'
    )
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')
  formData.append('timestamp_granularities[]', 'segment')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI Whisper erro ${res.status}: ${errorText}`)
  }

  return res.json() as Promise<WhisperVerboseResponse>
}
