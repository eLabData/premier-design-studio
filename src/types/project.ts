// Core types for Premier Design Studio

export interface Project {
  id: string
  name: string
  type: 'video' | 'post' | 'carousel'
  status: 'draft' | 'rendering' | 'ready' | 'published'
  created_at: string
  updated_at: string
  thumbnail_url?: string
  user_id: string
}

export interface VideoProject extends Project {
  type: 'video'
  duration: number // in seconds
  width: number
  height: number
  fps: number
  tracks: VideoTrack[]
  captions?: Caption[]
}

export interface VideoTrack {
  id: string
  type: 'main' | 'overlay' | 'audio' | 'caption'
  clips: VideoClip[]
}

export interface VideoClip {
  id: string
  source_url: string
  start_time: number // in seconds, position on timeline
  end_time: number
  trim_start: number // trim from source
  trim_end: number
  position?: { x: number; y: number } // for overlays
  size?: { width: number; height: number } // for overlays
  opacity?: number
  transition?: Transition
}

export interface Caption {
  id: string
  text: string
  start_time: number
  end_time: number
  style: CaptionStyle
}

export interface CaptionStyle {
  fontFamily: string
  fontSize: number
  color: string
  backgroundColor?: string
  position: 'top' | 'center' | 'bottom'
  animation?: 'none' | 'fade' | 'typewriter' | 'highlight'
}

export interface Transition {
  type: 'cut' | 'fade' | 'slide' | 'zoom'
  duration: number
}

export interface PostProject extends Project {
  type: 'post' | 'carousel'
  platform: Platform
  canvas_width: number
  canvas_height: number
  pages: PostPage[] // multiple for carousel
}

export interface PostPage {
  id: string
  elements: CanvasElement[]
  background: string
}

export interface CanvasElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'logo'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  props: Record<string, unknown>
}

export type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x'

export interface ScheduledPost {
  id: string
  project_id: string
  platforms: Platform[]
  scheduled_at: string
  status: 'scheduled' | 'publishing' | 'published' | 'failed'
  caption: string
  hashtags: string[]
  published_urls?: Record<Platform, string>
}

export const PLATFORM_SIZES: Record<Platform, Record<string, { width: number; height: number }>> = {
  instagram: {
    feed: { width: 1080, height: 1080 },
    story: { width: 1080, height: 1920 },
    reel: { width: 1080, height: 1920 },
  },
  facebook: {
    feed: { width: 1200, height: 630 },
    story: { width: 1080, height: 1920 },
  },
  youtube: {
    thumbnail: { width: 1280, height: 720 },
    short: { width: 1080, height: 1920 },
  },
  tiktok: {
    video: { width: 1080, height: 1920 },
  },
  x: {
    post: { width: 1200, height: 675 },
  },
}
