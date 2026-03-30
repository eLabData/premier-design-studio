import { useCurrentFrame, useVideoConfig, interpolate, Video } from 'remotion'

export interface BRollOverlayProps {
  src: string
  startFrame: number
  endFrame: number
  mode: 'pip' | 'fullscreen'
  position?: { x: number; y: number; w: number; h: number }
}

const FADE_FRAMES = 15 // ~0.5s at 30fps

export function BRollOverlay({
  src,
  startFrame,
  endFrame,
  mode,
  position,
}: BRollOverlayProps) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // Opacity: fade in at start, fade out at end
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + FADE_FRAMES, endFrame - FADE_FRAMES, endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  if (frame < startFrame || frame > endFrame) return null

  if (mode === 'fullscreen') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity,
          zIndex: 10,
        }}
      >
        <Video
          src={src}
          startFrom={0}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  // PIP mode
  const pip = position ?? {
    x: width - 340,
    y: 20,
    w: 320,
    h: 180,
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: pip.x,
        top: pip.y,
        width: pip.w,
        height: pip.h,
        opacity,
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        border: '2px solid rgba(255,255,255,0.12)',
      }}
    >
      <Video
        src={src}
        startFrom={0}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}
