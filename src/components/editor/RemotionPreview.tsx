'use client'

import { useRef, useEffect, useState } from 'react'
import { useEditorStore } from '@/lib/stores'
import type { CaptionedVideoProps, CaptionSegment, BRollClip, SilenceCutFrame } from '@/remotion/compositions/CaptionedVideo'
import type { TranscriptSegment, BRollResult, SilenceCut } from '@/types/project'

// Lazy-import the heavy Remotion Player only on the client
let PlayerModule: typeof import('@remotion/player') | null = null

function secToFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps)
}

function buildCaptionSegments(
  segments: TranscriptSegment[],
  fps: number
): CaptionSegment[] {
  return segments.map((seg) => ({
    text: seg.text,
    startFrame: secToFrame(seg.startTime, fps),
    endFrame: secToFrame(seg.endTime, fps),
    words: seg.words?.map((w) => ({
      word: w.word,
      startFrame: secToFrame(w.startTime, fps),
      endFrame: secToFrame(w.endTime, fps),
    })),
  }))
}

function buildBRollClips(results: BRollResult[], fps: number): BRollClip[] {
  return results
    .filter((r) => r.accepted && r.selectedUrl)
    .map((r) => ({
      src: r.selectedUrl!,
      startFrame: secToFrame(r.startTime, fps),
      endFrame: secToFrame(r.endTime, fps),
      mode: 'pip' as const,
    }))
}

function buildSilenceCuts(cuts: SilenceCut[], fps: number): SilenceCutFrame[] {
  return cuts
    .filter((c) => c.accepted)
    .map((c) => ({
      startFrame: secToFrame(c.startTime, fps),
      endFrame: secToFrame(c.endTime, fps),
    }))
}

export function RemotionPreview() {
  const { project, currentTime, setCurrentTime } = useEditorStore()
  const [playerLoaded, setPlayerLoaded] = useState(false)
  const playerRef = useRef<import('@remotion/player').PlayerRef>(null)

  // Dynamically import Remotion Player to avoid SSR issues
  useEffect(() => {
    import('@remotion/player').then((mod) => {
      PlayerModule = mod
      setPlayerLoaded(true)
    })
  }, [])

  // Sync currentTime → player
  useEffect(() => {
    const ref = playerRef.current
    if (!ref || !project) return
    const targetFrame = Math.round(currentTime * (project.fps || 30))
    const currentFrame = ref.getCurrentFrame()
    if (Math.abs(currentFrame - targetFrame) > 1) {
      ref.seekTo(targetFrame)
    }
  }, [currentTime, project])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg text-zinc-500 text-sm">
        Nenhum projeto carregado
      </div>
    )
  }

  if (!playerLoaded || !PlayerModule) {
    return (
      <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg text-zinc-500 text-sm animate-pulse">
        Carregando player Remotion…
      </div>
    )
  }

  const fps = project.fps || 30
  const durationInFrames = Math.max(1, Math.round(project.duration * fps))

  const mainClip = project.tracks
    .find((t) => t.type === 'main')
    ?.clips[0]

  if (!mainClip) {
    return (
      <div className="flex items-center justify-center h-64 bg-zinc-900 rounded-lg text-zinc-500 text-sm">
        Importe um vídeo para usar o player Remotion
      </div>
    )
  }

  const captions = buildCaptionSegments(
    project.transcript?.segments ?? [],
    fps
  )

  const brollClips = buildBRollClips(project.brollClips ?? [], fps)

  const silenceCuts = buildSilenceCuts(
    project.editSuggestions?.silenceCuts ?? [],
    fps
  )

  const compositionProps: CaptionedVideoProps = {
    videoSrc: mainClip.source_url,
    captions,
    brollClips,
    silenceCuts,
    captionStyle: project.captionStyle ?? 'bold',
    outputSize: { width: project.width, height: project.height },
  }

  const { Player } = PlayerModule

  // Dynamically require composition — imported inline to avoid top-level
  // import that would execute remotion on the server.
  // We use a dynamic require pattern via next/dynamic in the outer shell;
  // here we use the already-loaded Player from @remotion/player.
  const { CaptionedVideo } = require('@/remotion/compositions/CaptionedVideo') as typeof import('@/remotion/compositions/CaptionedVideo')

  // Cast required because Remotion's LooseComponentType expects Record<string,unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const PlayerComponent = CaptionedVideo as any

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
        Preview Remotion (com legendas e B-roll)
      </div>
      <div className="rounded-lg overflow-hidden border border-zinc-800">
        <Player
          ref={playerRef}
          component={PlayerComponent}
          compositionWidth={project.width}
          compositionHeight={project.height}
          durationInFrames={durationInFrames}
          fps={fps}
          inputProps={compositionProps}
          style={{
            width: '100%',
            aspectRatio: `${project.width} / ${project.height}`,
          }}
          controls
          loop={false}
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  )
}
