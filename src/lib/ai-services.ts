/**
 * Servicos de IA de alto nivel — implementacao real das funcoes de auto-edicao.
 * Substitui os stubs anteriores. Cada funcao rastreia custo via analytics.
 */

import { extractAudio } from '@/lib/ffmpeg'
import {
  chatCompletion,
  transcribeAudioVerbose,
  MODELS,
} from '@/lib/openrouter'
import { trackUsage } from '@/lib/analytics'
import type {
  TranscriptResult,
  TranscriptSegment,
  TranscriptWord,
  EditSuggestions,
  SilenceCut,
  BRollKeyword,
  BRollResult,
  Platform,
} from '@/types/project'
import type { PexelsBRollResult, PostCopy } from '@/types/ai'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Transcricao de Video ──────────────────────────────────────────────────────

/**
 * Extrai audio do video via FFmpeg e transcreve com Whisper (timestamps por palavra).
 * Requer OPENAI_API_KEY no .env.local.
 */
export async function transcribeVideo(videoFile: File): Promise<TranscriptResult> {
  const startedAt = Date.now()

  const audioBlob = await extractAudio(videoFile)
  const whisperData = await transcribeAudioVerbose(audioBlob)

  // Mapeia campos do Whisper (start/end) para o schema do projeto (startTime/endTime)
  const segments: TranscriptSegment[] = (whisperData.segments ?? []).map((seg) => ({
    text: seg.text,
    startTime: seg.start,
    endTime: seg.end,
    words: seg.words?.map(
      (w): TranscriptWord => ({
        word: w.word,
        startTime: w.start,
        endTime: w.end,
      })
    ),
  }))

  const result: TranscriptResult = {
    fullText: whisperData.text ?? '',
    segments,
    language: whisperData.language ?? 'pt',
    duration: whisperData.duration ?? 0,
  }

  // Custo aproximado Whisper: $0.006 por minuto
  const cost = (result.duration / 60) * 0.006

  trackUsage({
    userId: 'local',
    module: 'transcription',
    model: 'openai/whisper-1',
    provider: 'openai_direct',
    inputTokens: 0,
    outputTokens: 0,
    cost,
    durationMs: Date.now() - startedAt,
    metadata: {
      videoDurationSec: result.duration,
      fileSizeMb: videoFile.size / 1_048_576,
      language: result.language,
    },
  })

  return result
}

// ── Analise de Transcricao ────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `Voce e um editor de video profissional especializado em conteudo para redes sociais.
Analise a transcricao fornecida e retorne um JSON valido (sem markdown, apenas JSON puro) com a estrutura exata solicitada.
Identifique pausas, palavras de preenchimento (incluindo tipicas do portugues: "tipo", "ne", "entao", "assim", "dai", "cara"),
momentos de destaque, sugestoes de corte e legendas otimizadas.`

interface RawAnalysis {
  silenceCuts?: Array<{ startTime: number; endTime: number; type?: 'silence' | 'filler'; fillerWord?: string }>
  brollKeywords?: Array<{ keyword: string; startTime: number; endTime: number; reason: string }>
  summary?: string
  socialCaption?: string
  highlightMoments?: Array<{ startTime: number; endTime: number; reason: string }>
}

/**
 * Envia a transcricao para Claude e retorna sugestoes estruturadas de edicao.
 */
export async function analyzeTranscript(transcript: TranscriptResult): Promise<EditSuggestions> {
  const startedAt = Date.now()
  const model = MODELS.CLAUDE_SONNET

  const userPrompt = `Analise esta transcricao de video e retorne exatamente o seguinte JSON:
{
  "silenceCuts": [{"startTime": number, "endTime": number, "type": "silence"|"filler", "fillerWord": string|null}],
  "brollKeywords": [{"keyword": string, "startTime": number, "endTime": number, "reason": string}],
  "highlightMoments": [{"startTime": number, "endTime": number, "reason": string}],
  "summary": string,
  "socialCaption": string
}

Regras:
- silenceCuts: pausas > 0.8s entre palavras (type="silence") OU palavras de preenchimento (type="filler")
  Palavras de preenchimento: "uh", "um", "ah", "eh", "tipo", "ne", "entao", "assim", "dai", "cara", "basicamente", "literalmente"
- brollKeywords: um keyword por segmento relevante, em portugues ou ingles (melhor para busca)
- highlightMoments: 2-4 momentos mais impactantes do video
- summary: max 200 caracteres, descricao objetiva do conteudo
- socialCaption: legenda otimizada para Instagram com hashtags, max 2200 caracteres

Transcricao (duracao: ${transcript.duration.toFixed(1)}s, idioma: ${transcript.language}):
${JSON.stringify(transcript.segments, null, 2)}`

  const response = await chatCompletion(
    model,
    [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    {
      temperature: 0.2,
      maxTokens: 4096,
      responseFormat: { type: 'json_object' },
    }
  )

  trackUsage({
    userId: 'local',
    module: 'analysis',
    model,
    provider: 'openrouter',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    cost: response.cost,
    durationMs: Date.now() - startedAt,
    metadata: { videoDurationSec: transcript.duration },
  })

  let raw: RawAnalysis = {}
  try {
    raw = JSON.parse(response.content) as RawAnalysis
  } catch {
    throw new Error(
      'Falha ao interpretar resposta de analise de IA. Resposta: ' +
        response.content.slice(0, 300)
    )
  }

  const silenceCuts: SilenceCut[] = (raw.silenceCuts ?? []).map((sc) => ({
    id: generateId(),
    startTime: sc.startTime,
    endTime: sc.endTime,
    type: sc.type ?? 'silence',
    fillerWord: sc.fillerWord ?? undefined,
    accepted: true,
  }))

  const brollKeywords: BRollKeyword[] = (raw.brollKeywords ?? []).map((bk) => ({
    keyword: bk.keyword,
    startTime: bk.startTime,
    endTime: bk.endTime,
    reason: bk.reason,
  }))

  return {
    silenceCuts,
    brollKeywords,
    summary: raw.summary ?? '',
    socialCaption: raw.socialCaption ?? '',
    highlightMoments: (raw.highlightMoments ?? []).map((h) => ({
      startTime: h.startTime,
      endTime: h.endTime,
      reason: h.reason,
    })),
  }
}

// ── Busca de B-Roll ───────────────────────────────────────────────────────────

interface PexelsVideoFile {
  link: string
  quality: string
  width: number
  height: number
}

interface PexelsVideo {
  video_files: PexelsVideoFile[]
  image: string
  duration: number
}

interface PexelsSearchResponse {
  videos: PexelsVideo[]
}

/**
 * Busca videos de B-Roll no Pexels para cada keyword fornecida.
 * Retorna resultados no formato do schema do projeto (BRollResult[]).
 */
export async function searchBRoll(
  keywords: { keyword: string; startTime: number; endTime: number }[]
): Promise<BRollResult[]> {
  const startedAt = Date.now()
  const pexelsKey =
    process.env.PEXELS_API_KEY ?? process.env.NEXT_PUBLIC_PEXELS_API_KEY

  if (!pexelsKey) {
    throw new Error(
      'PEXELS_API_KEY nao configurada. Defina no arquivo .env.local para habilitar busca de B-Roll.'
    )
  }

  const results: BRollResult[] = []

  await Promise.allSettled(
    keywords.slice(0, 5).map(async (kw) => {
      try {
        const url = new URL('https://api.pexels.com/videos/search')
        url.searchParams.set('query', kw.keyword)
        url.searchParams.set('per_page', '3')
        url.searchParams.set('size', 'small')

        const res = await fetch(url.toString(), {
          headers: { Authorization: pexelsKey },
        })

        if (!res.ok) return

        const data = (await res.json()) as PexelsSearchResponse

        for (const video of data.videos ?? []) {
          const file =
            video.video_files.find((f) => f.quality === 'hd') ??
            video.video_files[0]

          if (file) {
            results.push({
              id: generateId(),
              keyword: kw.keyword,
              startTime: kw.startTime,
              endTime: kw.endTime,
              thumbnailUrl: video.image,
              videoUrl: file.link,
              source: 'pexels',
              accepted: true,
            })
          }
        }
      } catch {
        // falha silenciosa por keyword — nao bloqueia as demais
      }
    })
  )

  trackUsage({
    userId: 'local',
    module: 'broll_search',
    model: 'pexels',
    provider: 'pexels',
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    durationMs: Date.now() - startedAt,
    metadata: { keywordCount: keywords.length, resultsFound: results.length },
  })

  return results
}

/**
 * Versao alternativa que retorna o formato simplificado PexelsBRollResult
 * para uso em componentes que nao precisam do schema completo de projeto.
 */
export async function searchBRollSimple(keywords: string[]): Promise<PexelsBRollResult[]> {
  const kws = keywords.map((k) => ({ keyword: k, startTime: 0, endTime: 0 }))
  const results = await searchBRoll(kws)
  return results.map((r) => ({
    url: r.videoUrl,
    thumbnail: r.thumbnailUrl,
    width: 0,
    height: 0,
    duration: 0,
    keyword: r.keyword,
  }))
}

// ── Geracao de Legenda ────────────────────────────────────────────────────────

/**
 * Usa Claude Haiku para melhorar ou reformular o texto de uma legenda.
 * Mantém maximo de 7 palavras para uso em sobreposicao de video.
 */
export async function generateCaption(text: string, context: string): Promise<string> {
  const startedAt = Date.now()
  const model = MODELS.CLAUDE_HAIKU

  const response = await chatCompletion(
    model,
    [
      {
        role: 'system',
        content:
          'Voce e um editor de legendas para videos de redes sociais. ' +
          'Reescreva a legenda para ser mais impactante, concisa e engajadora. ' +
          'Maximo de 7 palavras. Responda apenas com o texto da legenda, sem aspas ou explicacoes.',
      },
      {
        role: 'user',
        content: `Contexto do video: ${context}\n\nLegenda original: ${text}`,
      },
    ],
    { temperature: 0.7, maxTokens: 50 }
  )

  trackUsage({
    userId: 'local',
    module: 'caption_gen',
    model,
    provider: 'openrouter',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    cost: response.cost,
    durationMs: Date.now() - startedAt,
    metadata: { originalLength: text.length },
  })

  return response.content.trim()
}

// ── Geracao de Copia para Redes Sociais ───────────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<Platform, string> = {
  instagram:
    'Instagram: maximo 2200 caracteres, emojis relevantes, tom pessoal e autentico, hashtags ao final (max 30)',
  facebook:
    'Facebook: maximo 500 caracteres no corpo principal, tom conversacional, pode incluir link',
  youtube:
    'YouTube: titulo atraente + descricao com timestamps e palavras-chave para SEO, call-to-action para inscricao',
  tiktok:
    'TikTok: maximo 150 caracteres, muito direto, trending hashtags, tom jovem e divertido',
  x: 'X/Twitter: maximo 280 caracteres, conciso, opinativo ou provocativo, 2-3 hashtags no maximo',
}

/**
 * Gera copia de texto otimizada para cada plataforma de rede social.
 */
export async function generatePostCopy(
  description: string,
  platform: Platform
): Promise<PostCopy> {
  const startedAt = Date.now()
  const model = MODELS.CLAUDE_HAIKU

  const instruction = PLATFORM_INSTRUCTIONS[platform]

  const response = await chatCompletion(
    model,
    [
      {
        role: 'system',
        content:
          'Voce e um especialista em marketing digital e copywriting para redes sociais brasileiras. ' +
          'Retorne apenas JSON valido com os campos "text", "hashtags" (array de strings sem #) e "callToAction". ' +
          'Escreva em portugues do Brasil.',
      },
      {
        role: 'user',
        content:
          `Plataforma: ${platform}\n` +
          `Instrucoes: ${instruction}\n\n` +
          `Descricao do conteudo: ${description}\n\n` +
          `Retorne JSON: {"text": "...", "hashtags": ["...", "..."], "callToAction": "..."}`,
      },
    ],
    {
      temperature: 0.8,
      maxTokens: 600,
      responseFormat: { type: 'json_object' },
    }
  )

  trackUsage({
    userId: 'local',
    module: 'post_copy',
    model,
    provider: 'openrouter',
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    cost: response.cost,
    durationMs: Date.now() - startedAt,
    metadata: { platform },
  })

  try {
    const parsed = JSON.parse(response.content) as Partial<PostCopy>
    return {
      text: parsed.text ?? '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      callToAction: parsed.callToAction ?? '',
    }
  } catch {
    return {
      text: response.content.trim(),
      hashtags: [],
      callToAction: '',
    }
  }
}
