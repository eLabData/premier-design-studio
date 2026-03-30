import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion'
import type { CaptionStyleName } from '@/types/project'

export interface CaptionWord {
  word: string
  startFrame: number
  endFrame: number
}

export interface AnimatedCaptionProps {
  words: CaptionWord[]
  captionStyle: CaptionStyleName
}

const STYLE_CONFIG: Record<
  CaptionStyleName,
  {
    baseColor: string
    highlightColor: string
    dimColor: string
    bg: string
    fontWeight: string
    shadow: string
  }
> = {
  minimal: {
    baseColor: '#ffffff',
    highlightColor: '#ffffff',
    dimColor: 'rgba(255,255,255,0.75)',
    bg: 'rgba(0,0,0,0)',
    fontWeight: '600',
    shadow: '0 2px 8px rgba(0,0,0,0.9)',
  },
  bold: {
    baseColor: '#ffffff',
    highlightColor: '#22c55e',
    dimColor: 'rgba(255,255,255,0.6)',
    bg: 'rgba(0,0,0,0.55)',
    fontWeight: '800',
    shadow: '0 2px 4px rgba(0,0,0,0.6)',
  },
  karaoke: {
    baseColor: 'rgba(255,255,255,0.45)',
    highlightColor: '#facc15',
    dimColor: 'rgba(255,255,255,0.45)',
    bg: 'rgba(0,0,0,0.6)',
    fontWeight: '700',
    shadow: '0 0 12px rgba(250,204,21,0.4)',
  },
  boxed: {
    baseColor: '#ffffff',
    highlightColor: '#ffffff',
    dimColor: 'rgba(255,255,255,0.7)',
    bg: 'rgba(0,0,0,0.82)',
    fontWeight: '600',
    shadow: 'none',
  },
}

export function AnimatedCaption({ words, captionStyle }: AnimatedCaptionProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const cfg = STYLE_CONFIG[captionStyle]

  // Find the index of the word currently being spoken
  const currentWordIndex = words.findIndex(
    (w) => frame >= w.startFrame && frame <= w.endFrame
  )

  // Keep last word highlighted briefly after it finishes
  const activeIndex =
    currentWordIndex === -1
      ? words.findLastIndex((w) => frame > w.endFrame)
      : currentWordIndex

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 8px',
        padding: cfg.bg !== 'rgba(0,0,0,0)' ? '10px 18px' : '4px 0',
        borderRadius: 12,
        background: cfg.bg,
        maxWidth: '85%',
        lineHeight: 1.4,
      }}
    >
      {words.map((w, i) => {
        const isActive = i === activeIndex
        const isPast = i < activeIndex

        // Spring animation for active word scale
        const scale = isActive
          ? spring({
              fps,
              frame: frame - w.startFrame,
              config: { damping: 10, stiffness: 200, mass: 0.6 },
              from: 1,
              to: 1.12,
            })
          : 1

        // Opacity: active = 1, past = dimmed, future = dimmer
        const opacity = isActive ? 1 : isPast ? 0.75 : 0.45

        // Color logic
        let color = cfg.baseColor
        if (isActive) color = cfg.highlightColor
        else if (i < activeIndex) color = cfg.dimColor

        // Karaoke fill effect: interpolate color position
        const karaokeProgress =
          captionStyle === 'karaoke' && isActive && w.endFrame > w.startFrame
            ? interpolate(frame, [w.startFrame, w.endFrame], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : captionStyle === 'karaoke' && isPast
            ? 1
            : 0

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${scale})`,
              transformOrigin: 'center bottom',
              color,
              opacity,
              fontWeight: cfg.fontWeight,
              fontSize: 52,
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: cfg.shadow,
              transition: 'opacity 0.1s',
              // Karaoke gradient overlay
              backgroundImage:
                captionStyle === 'karaoke' && (isActive || isPast)
                  ? `linear-gradient(to right, ${cfg.highlightColor} ${karaokeProgress * 100}%, ${cfg.baseColor} ${karaokeProgress * 100}%)`
                  : 'none',
              WebkitBackgroundClip:
                captionStyle === 'karaoke' ? 'text' : 'unset',
              WebkitTextFillColor:
                captionStyle === 'karaoke' ? 'transparent' : 'unset',
            }}
          >
            {w.word}
          </span>
        )
      })}
    </div>
  )
}
