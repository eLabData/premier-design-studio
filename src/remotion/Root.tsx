import { Composition } from 'remotion'
import { CaptionedVideo as CaptionedVideoImpl } from './compositions/CaptionedVideo'
import { SocialClip as SocialClipImpl } from './compositions/SocialClip'
import { FacelessShort as FacelessShortImpl } from './compositions/FacelessShort'
import type { ComponentType } from 'react'

// Remotion requires LooseComponentType<Record<string,unknown>> — cast via unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CaptionedVideo = CaptionedVideoImpl as ComponentType<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SocialClip = SocialClipImpl as ComponentType<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FacelessShort = FacelessShortImpl as ComponentType<any>

export function RemotionRoot() {
  return (
    <>
      {/* Main editor composition — landscape 1080p */}
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          videoSrc: '',
          captions: [],
          brollClips: [],
          silenceCuts: [],
          captionStyle: 'bold' as const,
          outputSize: { width: 1920, height: 1080 },
        }}
      />

      {/* Social clip — vertical 9:16 for Reels/TikTok */}
      <Composition
        id="SocialClip"
        component={SocialClip}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoSrc: '',
          captions: [],
          captionStyle: 'bold' as const,
          showProgressBar: true,
          totalFrames: 300,
        }}
      />
      {/* Faceless short — vertical 9:16 for image/audio driven content */}
      <Composition
        id="FacelessShort"
        component={FacelessShort}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          audioUrl: '',
          captions: [],
          captionStyle: 'bold' as const,
          format: 'short' as const,
          totalFrames: 900,
        }}
      />
    </>
  )
}
