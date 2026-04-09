import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion'
import { AnimatedCaption } from '../components/AnimatedCaption'
import type { CaptionStyleName } from '@/types/project'

export interface FacelessScene {
  imageUrl?: string
  videoUrl?: string
  durationFrames: number
  startFrame: number
  motion:
    | 'zoom-in'
    | 'zoom-out'
    | 'pan-left'
    | 'pan-right'
    | 'ken-burns'
    | 'none'
}

export interface FacelessCaptionSegment {
  text: string
  startFrame: number
  endFrame: number
  words?: { word: string; startFrame: number; endFrame: number }[]
}

export interface FacelessShortProps {
  scenes: FacelessScene[]
  audioUrl: string
  captions: FacelessCaptionSegment[]
  captionStyle: CaptionStyleName
  format: 'short' | 'reel' | 'tiktok'
  brandName?: string
  showProgressBar?: boolean
  totalFrames: number
}

const INTRO_FRAMES = 30
const OUTRO_FRAMES = 45
const CROSSFADE_FRAMES = 10

interface SceneRendererProps {
  scene: FacelessScene
  localFrame: number
}

function SceneRenderer({ scene, localFrame }: SceneRendererProps) {
  const { durationFrames, motion } = scene
  const progress = durationFrames > 0 ? localFrame / durationFrames : 0

  let transform = ''
  let scale = 1

  switch (motion) {
    case 'zoom-in':
      scale = interpolate(progress, [0, 1], [1, 1.15], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      transform = `scale(${scale})`
      break

    case 'zoom-out':
      scale = interpolate(progress, [0, 1], [1.15, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      transform = `scale(${scale})`
      break

    case 'pan-left': {
      const tx = interpolate(progress, [0, 1], [0, -5], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      transform = `scale(1.1) translateX(${tx}%)`
      break
    }

    case 'pan-right': {
      const tx2 = interpolate(progress, [0, 1], [-5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      transform = `scale(1.1) translateX(${tx2}%)`
      break
    }

    case 'ken-burns': {
      const kbScale = interpolate(progress, [0, 1], [1, 1.12], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      const kbX = interpolate(progress, [0, 1], [0, 2], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      const kbY = interpolate(progress, [0, 1], [0, -1.5], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      transform = `scale(${kbScale}) translate(${kbX}%, ${kbY}%)`
      break
    }

    case 'none':
    default:
      transform = 'none'
      break
  }

  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform,
    transformOrigin: 'center center',
  }

  if (scene.videoUrl) {
    return (
      <OffthreadVideo
        src={scene.videoUrl}
        startFrom={0}
        style={mediaStyle}
      />
    )
  }

  if (scene.imageUrl) {
    return <Img src={scene.imageUrl} style={mediaStyle} />
  }

  return <div style={{ width: '100%', height: '100%', background: '#111' }} />
}

export function FacelessShort({
  scenes,
  audioUrl,
  captions,
  captionStyle,
  brandName,
  showProgressBar = true,
  totalFrames,
}: FacelessShortProps) {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()

  const activeCaption = captions.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  )

  const progress = totalFrames > 0 ? frame / totalFrames : 0

  // Brand name pop-in at intro
  const brandScale =
    frame < INTRO_FRAMES
      ? spring({
          fps,
          frame,
          config: { damping: 14, stiffness: 200, mass: 0.8 },
          from: 0.5,
          to: 1,
        })
      : 1

  const brandOpacity = interpolate(
    frame,
    [0, INTRO_FRAMES * 0.5, INTRO_FRAMES, INTRO_FRAMES + 10],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // Outro fade-out
  const contentOpacity = interpolate(
    frame,
    [totalFrames - OUTRO_FRAMES, totalFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Scenes with crossfade transitions */}
      <div style={{ position: 'absolute', inset: 0, opacity: contentOpacity }}>
        {scenes.map((scene, i) => {
          const sceneStart = scene.startFrame
          const sceneEnd = sceneStart + scene.durationFrames
          const localFrame = frame - sceneStart

          // Opacity for crossfade: fade in over CROSSFADE_FRAMES at start,
          // fade out over CROSSFADE_FRAMES at end (except last scene)
          const isFirst = i === 0
          const isLast = i === scenes.length - 1

          const fadeInEnd = isFirst ? 0 : CROSSFADE_FRAMES
          const fadeOutStart = isLast ? scene.durationFrames : scene.durationFrames - CROSSFADE_FRAMES

          const sceneOpacity = interpolate(
            localFrame,
            [0, fadeInEnd, fadeOutStart, scene.durationFrames],
            [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          )

          // Only render visible scenes
          if (frame < sceneStart - CROSSFADE_FRAMES || frame > sceneEnd + CROSSFADE_FRAMES) {
            return null
          }

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: sceneOpacity,
              }}
            >
              <SceneRenderer scene={scene} localFrame={Math.max(0, localFrame)} />
            </div>
          )
        })}
      </div>

      {/* Audio narration */}
      {audioUrl ? <Audio src={audioUrl} /> : null}

      {/* Dark gradient scrim at bottom for caption readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Progress bar */}
      {showProgressBar && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'rgba(255,255,255,0.2)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: '#22c55e',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      )}

      {/* Brand name intro overlay */}
      {brandName && (
        <div
          style={{
            position: 'absolute',
            top: height * 0.35,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: brandOpacity,
            transform: `scale(${brandScale})`,
            zIndex: 25,
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 64,
              fontWeight: 900,
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '-2px',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
            }}
          >
            {brandName}
          </div>
        </div>
      )}

      {/* Captions */}
      {activeCaption && (
        <div
          style={{
            position: 'absolute',
            bottom: height * 0.15,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: `0 ${width * 0.06}px`,
            zIndex: 20,
          }}
        >
          {activeCaption.words && activeCaption.words.length > 0 ? (
            <AnimatedCaption
              words={activeCaption.words}
              captionStyle={captionStyle}
            />
          ) : (
            <div
              style={{
                color: '#fff',
                fontSize: 56,
                fontWeight: 800,
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                textAlign: 'center',
              }}
            >
              {activeCaption.text}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  )
}
