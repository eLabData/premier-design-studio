import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
} from 'remotion'
import { AnimatedCaption } from '../components/AnimatedCaption'
import { BRollOverlay } from '../components/BRollOverlay'
import type { CaptionStyleName } from '@/types/project'

export interface CaptionSegment {
  text: string
  startFrame: number
  endFrame: number
  words?: { word: string; startFrame: number; endFrame: number }[]
}

export interface BRollClip {
  src: string
  startFrame: number
  endFrame: number
  mode: 'pip' | 'fullscreen'
  position?: { x: number; y: number; w: number; h: number }
}

export interface SilenceCutFrame {
  startFrame: number
  endFrame: number
}

export interface CaptionedVideoProps {
  videoSrc: string
  captions: CaptionSegment[]
  brollClips: BRollClip[]
  silenceCuts: SilenceCutFrame[]
  captionStyle: CaptionStyleName
  outputSize: { width: number; height: number }
}

/**
 * Resolves the effective source frame from the original video, skipping any
 * silence cut segments. Returns null if the current frame falls inside a cut.
 */
function resolveSourceFrame(
  frame: number,
  silenceCuts: SilenceCutFrame[]
): number | null {
  let offset = 0
  for (const cut of silenceCuts) {
    const cutDuration = cut.endFrame - cut.startFrame
    const adjustedStart = cut.startFrame - offset
    if (frame >= adjustedStart && frame < adjustedStart) {
      // Inside a removed segment — skip
      return null
    }
    if (frame >= adjustedStart) {
      offset += cutDuration
    }
  }
  return frame + offset
}

export function CaptionedVideo({
  videoSrc,
  captions,
  brollClips,
  silenceCuts,
  captionStyle,
}: CaptionedVideoProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // Determine which caption is active
  const activeCaption = captions.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  )

  // Resolve source frame (accounting for removed silences)
  const sourceFrame = resolveSourceFrame(frame, silenceCuts)

  const isVertical = height > width

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Main video */}
      {sourceFrame !== null && (
        <OffthreadVideo
          src={videoSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isVertical ? 'cover' : 'contain',
          }}
        />
      )}

      {/* B-roll overlays */}
      {brollClips.map((clip, i) => (
        <BRollOverlay key={i} {...clip} />
      ))}

      {/* Captions */}
      {activeCaption && (
        <div
          style={{
            position: 'absolute',
            bottom: isVertical ? height * 0.18 : 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 40px',
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
                fontSize: 48,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                textAlign: 'center',
                padding: '8px 16px',
                borderRadius: 8,
                background:
                  captionStyle === 'boxed' ? 'rgba(0,0,0,0.8)' : 'transparent',
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

// Silence-cut aware video wrapper — used internally for jump-cut simulation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _JumpCutVideo({
  src,
  silenceCuts,
}: {
  src: string
  silenceCuts: SilenceCutFrame[]
}) {
  const frame = useCurrentFrame()
  const totalOffset = silenceCuts
    .filter((c) => c.startFrame <= frame)
    .reduce((acc, c) => acc + (c.endFrame - c.startFrame), 0)

  return (
    <Video
      src={src}
      startFrom={totalOffset}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}
