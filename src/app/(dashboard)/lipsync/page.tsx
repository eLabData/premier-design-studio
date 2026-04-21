'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Mic, Loader2, Download, Play, User, Video, Sparkles } from 'lucide-react'

type Mode = 'avatar' | 'dub'

type ModelOpt = {
  id: string
  label: string
  priceLabel: string
  hint: string
}

const AVATAR_MODELS: ModelOpt[] = [
  { id: 'veed-fabric-480', label: 'VEED Fabric 480p', priceLabel: '$0.08/s', hint: 'Rápido, qualidade média' },
  { id: 'veed-fabric-720', label: 'VEED Fabric 720p', priceLabel: '$0.15/s', hint: 'HD, mais nítido' },
  { id: 'omnihuman-v1.5', label: 'Omnihuman v1.5', priceLabel: '$0.16/s', hint: 'Máxima qualidade, movimentos naturais' },
]

const DUB_MODELS: ModelOpt[] = [
  { id: 'heygen-speed', label: 'HeyGen Speed', priceLabel: '~$2/min', hint: 'Rápido, bom pra dublagem' },
  { id: 'sync-v2', label: 'Sync Lipsync v2', priceLabel: '~$3/min', hint: 'Melhor precisão' },
]

export default function LipsyncPage() {
  const [mode, setMode] = useState<Mode>('avatar')
  const [model, setModel] = useState<string>('veed-fabric-480')
  const [imageData, setImageData] = useState<string | null>(null)
  const [videoData, setVideoData] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ videoUrl: string; costUsd?: number; durationSec?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const models = mode === 'avatar' ? AVATAR_MODELS : DUB_MODELS

  const readFile = (file: File, setter: (data: string) => void, maxMB: number) => {
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo ${maxMB}MB.`)
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setModel(m === 'avatar' ? 'veed-fabric-480' : 'heygen-speed')
    setResult(null)
    setError(null)
  }

  const canGenerate =
    !generating && audioData && ((mode === 'avatar' && imageData) || (mode === 'dub' && videoData))

  const generate = async () => {
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const body: Record<string, unknown> = { model, audio_url: audioData }
      if (mode === 'avatar') body.image_url = imageData
      else body.video_url = videoData

      const res = await fetch('/api/ai/lipsync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar')
      setResult({ videoUrl: data.videoUrl, costUsd: data.usage?.costUsd, durationSec: data.durationSec })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-pink-500" /> Lip Sync Studio
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Anime um retrato com áudio ou sincronize lábios em um vídeo existente.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => switchMode('avatar')}
          className={`flex-1 px-4 py-3 rounded-lg border text-left transition-colors ${
            mode === 'avatar'
              ? 'border-pink-500 bg-pink-500/10 text-pink-200'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4" /> Avatar (foto + áudio)
          </div>
          <div className="text-xs text-zinc-500 mt-1">Imagem estática fala o áudio</div>
        </button>
        <button
          onClick={() => switchMode('dub')}
          className={`flex-1 px-4 py-3 rounded-lg border text-left transition-colors ${
            mode === 'dub'
              ? 'border-pink-500 bg-pink-500/10 text-pink-200'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Video className="w-4 h-4" /> Dublagem (vídeo + áudio)
          </div>
          <div className="text-xs text-zinc-500 mt-1">Sincroniza lábios em vídeo existente</div>
        </button>
      </div>

      <div className="space-y-5">
        {/* Image or Video upload */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-2 block">
            {mode === 'avatar' ? '1. Retrato (JPG/PNG/WebP)' : '1. Vídeo base (MP4/MOV)'}
          </label>
          <input
            type="file"
            accept={mode === 'avatar' ? 'image/*' : 'video/*'}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              if (mode === 'avatar') readFile(f, setImageData, 10)
              else readFile(f, setVideoData, 50)
            }}
            className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-zinc-700 file:bg-zinc-800 file:text-zinc-200 file:text-sm hover:file:bg-zinc-700 file:cursor-pointer"
          />
          {mode === 'avatar' && imageData && (
            <div className="mt-3 rounded-lg overflow-hidden w-32 h-32">
              <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          {mode === 'dub' && videoData && (
            <video src={videoData} controls className="mt-3 rounded-lg max-w-xs" />
          )}
        </div>

        {/* Audio upload */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-2 block flex items-center gap-2">
            <Mic className="w-4 h-4" /> 2. Áudio (MP3/WAV/M4A)
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) readFile(f, setAudioData, 20)
            }}
            className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-zinc-700 file:bg-zinc-800 file:text-zinc-200 file:text-sm hover:file:bg-zinc-700 file:cursor-pointer"
          />
          {audioData && <audio src={audioData} controls className="mt-3 w-full max-w-md" />}
        </div>

        {/* Model picker */}
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-2 block">3. Modelo</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {models.map((m) => {
              const active = model === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    active
                      ? 'border-pink-500 bg-pink-500/10 text-pink-200'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="text-[10px] text-zinc-500">{m.priceLabel}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{m.hint}</div>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={generate}
          disabled={!canGenerate}
          className="w-full px-4 py-3 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Gerando vídeo... (pode levar 1-3 min)
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Gerar Lip Sync
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Resultado</h3>
              {result.costUsd !== undefined && result.costUsd > 0 && (
                <span className="text-xs text-zinc-500">
                  ${result.costUsd.toFixed(2)} · {result.durationSec?.toFixed(1)}s
                </span>
              )}
            </div>
            <video src={result.videoUrl} controls className="w-full rounded-lg max-h-[70vh]" />
            <a
              href={result.videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white"
            >
              <Download className="w-4 h-4" /> Baixar MP4
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
