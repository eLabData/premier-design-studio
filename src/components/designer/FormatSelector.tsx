'use client'

import { PLATFORM_SIZES, type Platform } from '@/types/project'

interface FormatSelectorProps {
  selectedPlatform: Platform
  selectedFormat: string
  onSelect: (platform: Platform, format: string, width: number, height: number) => void
}

const platformLabels: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
}

const formatLabels: Record<string, string> = {
  feed: 'Feed',
  story: 'Story',
  reel: 'Reel',
  short: 'Short',
  thumbnail: 'Miniatura',
  video: 'Vídeo',
  post: 'Post',
}

export function FormatSelector({ selectedPlatform, selectedFormat, onSelect }: FormatSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Formato</p>
      {(Object.entries(PLATFORM_SIZES) as [Platform, Record<string, { width: number; height: number }>][]).map(
        ([platform, formats]) => (
          <div key={platform}>
            <p className="text-xs text-zinc-500 mb-1.5">{platformLabels[platform]}</p>
            <div className="space-y-1">
              {Object.entries(formats).map(([fmt, { width, height }]) => {
                const isActive = selectedPlatform === platform && selectedFormat === fmt
                const ratio = width / height
                const previewW = ratio >= 1 ? 28 : Math.round(28 * ratio)
                const previewH = ratio >= 1 ? Math.round(28 / ratio) : 28
                return (
                  <button
                    key={fmt}
                    onClick={() => onSelect(platform, fmt, width, height)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors text-sm ${
                      isActive
                        ? 'bg-green-500/15 border border-green-500/40 text-white'
                        : 'border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <div
                      className={`shrink-0 rounded-sm border ${isActive ? 'border-green-500/60 bg-green-500/10' : 'border-zinc-600'}`}
                      style={{ width: previewW, height: previewH }}
                    />
                    <span className="flex-1">{formatLabels[fmt] ?? fmt}</span>
                    <span className="text-[10px] text-zinc-600">
                      {width}×{height}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ),
      )}
    </div>
  )
}
