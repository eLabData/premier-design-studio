import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion'
import { AnimatedCaption } from '../components/AnimatedCaption'
import type { CaptionSegment } from './CaptionedVideo'
import type { CaptionStyleName } from '@/types/project'

export interface SocialClipProps {
  videoSrc: string
  captions: CaptionSegment[]
  captionStyle: CaptionStyleName
  brandName?: string
  showProgressBar?: boolean
  totalFrames: number
}

const INTRO_FRAMES = 30 // 1s intro
const OUTRO_FRAMES = 45 // 1.5s outro

export function SocialClip({
  videoSrc,
  captions,
  captionStyle,
  brandName,
  showProgressBar = true,
  totalFrames,
}: SocialClipProps) {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()

  const activeCaption = captions.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  )

  // Progress bar value (0 to 1)
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
      {/* Main video — cropped to fill vertical format */}
      <div style={{ position: 'absolute', inset: 0, opacity: contentOpacity }}>
        <OffthreadVideo
          src={videoSrc}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

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
