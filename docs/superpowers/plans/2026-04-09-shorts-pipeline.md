# Shorts Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered shorts video pipeline that generates faceless short-form videos from text topics, replacing BigMotion.

**Architecture:** Wizard-based frontend at `/shorts` sends requests to `/api/ai/shorts` orchestrator. Orchestrator runs 5 async stages (script → TTS → visuals → Remotion render → metadata), updating status in Supabase `shorts` table. Each stage calls OpenRouter or fal.ai. Frontend polls for status updates. Videos stored in Supabase Storage.

**Tech Stack:** Next.js 16 App Router, Supabase (DB + Storage), OpenRouter (Claude Sonnet for scripts/metadata), fal.ai (TTS + image gen), Remotion (video composition), existing AnimatedCaption component.

**Spec:** `docs/superpowers/specs/2026-04-09-shorts-pipeline-design.md`

---

### Task 1: Database migration — `shorts` table

**Files:**
- Create: `supabase/migrations/006_shorts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/006_shorts.sql
create table shorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references ai_jobs(id) on delete set null,
  title text not null default 'Untitled',
  script text,
  language text not null check (language in ('pt-br', 'en')),
  format text not null default 'short' check (format in ('short', 'normal')),
  visual_mode text not null check (visual_mode in ('images', 'video_ai', 'hybrid')),
  tts_provider text not null check (tts_provider in ('fal_ai', 'elevenlabs', 'openai')),
  caption_style text default 'bold',
  narration_url text,
  scenes jsonb default '[]',
  video_url text,
  thumbnail_url text,
  captions jsonb default '[]',
  platform_metadata jsonb default '{}',
  cost_usd numeric(10,6) default 0,
  cost_breakdown jsonb default '{}',
  credits_charged integer default 0,
  status text default 'pending' check (status in (
    'pending', 'generating_script', 'generating_audio',
    'generating_visuals', 'composing', 'completed', 'failed'
  )),
  error_message text,
  file_size_mb numeric default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table shorts enable row level security;
create policy "Users can read own shorts" on shorts for select using (auth.uid() = user_id);
create policy "Users can delete own shorts" on shorts for delete using (auth.uid() = user_id);
create index idx_shorts_user on shorts(user_id, created_at desc);
create index idx_shorts_status on shorts(status);
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase SQL Editor or CLI:
```bash
# Via CLI if linked:
npx supabase db push
# Or paste the SQL directly in the Supabase Dashboard SQL Editor
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_shorts.sql
git commit -m "feat: add shorts table migration (006)"
```

---

### Task 2: Shared types and cost config

**Files:**
- Create: `src/types/shorts.ts`
- Create: `src/lib/shorts-config.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/types/shorts.ts

export type ShortLanguage = 'pt-br' | 'en'
export type ShortFormat = 'short' | 'normal'
export type VisualMode = 'images' | 'video_ai' | 'hybrid'
export type TTSProvider = 'fal_ai' | 'elevenlabs' | 'openai'
export type ShortStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_audio'
  | 'generating_visuals'
  | 'composing'
  | 'completed'
  | 'failed'

export type MotionType = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'none'

export interface ShortScene {
  index: number
  text: string
  imagePrompt: string
  imageUrl?: string
  videoUrl?: string
  motion: MotionType
  durationFrames: number
  startFrame: number
}

export interface PlatformMetadata {
  youtube: { title: string; description: string; tags: string[]; category: string }
  instagram: { caption: string; hashtags: string[] }
  tiktok: { caption: string; hashtags: string[] }
}

export interface CostBreakdown {
  script: number
  tts: number
  images: number
  video_clips: number
  composition: number
  metadata: number
  total: number
}

export interface ShortRecord {
  id: string
  user_id: string
  job_id: string | null
  title: string
  script: string | null
  language: ShortLanguage
  format: ShortFormat
  visual_mode: VisualMode
  tts_provider: TTSProvider
  caption_style: string
  narration_url: string | null
  scenes: ShortScene[]
  video_url: string | null
  thumbnail_url: string | null
  captions: { text: string; startFrame: number; endFrame: number; words?: { word: string; startFrame: number; endFrame: number }[] }[]
  platform_metadata: PlatformMetadata | Record<string, never>
  cost_usd: number
  cost_breakdown: CostBreakdown | Record<string, never>
  credits_charged: number
  status: ShortStatus
  error_message: string | null
  file_size_mb: number
  created_at: string
  completed_at: string | null
}

export interface CreateShortRequest {
  topic: string
  language: ShortLanguage
  format: ShortFormat
  visualMode: VisualMode
  ttsProvider: TTSProvider
  captionStyle?: string
  customScript?: string | null
}

export interface CostEstimate {
  estimatedCostUsd: number
  breakdown: CostBreakdown
  estimatedCredits: number
  estimatedDurationSec: number
}
```

- [ ] **Step 2: Create cost config**

```typescript
// src/lib/shorts-config.ts

import type { VisualMode, TTSProvider } from '@/types/shorts'

export const SUPER_ADMIN_EMAIL = 'rafael@elabdata.com.br'

export const TTS_COSTS: Record<TTSProvider, number> = {
  fal_ai: 0.02,
  elevenlabs: 0.08,
  openai: 0.015,
}

export const IMAGE_COST_PER_SCENE = 0.003 // FLUX Schnell
export const VIDEO_CLIP_COST_PER_SCENE = 0.80 // Kling/similar
export const SCRIPT_COST = 0.01 // OpenRouter Claude
export const METADATA_COST = 0.005 // OpenRouter Claude

export function estimateCost(
  visualMode: VisualMode,
  ttsProvider: TTSProvider,
  sceneCount: number,
): { costUsd: number; breakdown: Record<string, number> } {
  const ttsCost = TTS_COSTS[ttsProvider]
  let imagesCost = 0
  let videoClipsCost = 0

  if (visualMode === 'images') {
    imagesCost = sceneCount * IMAGE_COST_PER_SCENE
  } else if (visualMode === 'video_ai') {
    videoClipsCost = sceneCount * VIDEO_CLIP_COST_PER_SCENE
  } else {
    // hybrid: 60% images, 40% video
    const imgScenes = Math.ceil(sceneCount * 0.6)
    const vidScenes = sceneCount - imgScenes
    imagesCost = imgScenes * IMAGE_COST_PER_SCENE
    videoClipsCost = vidScenes * VIDEO_CLIP_COST_PER_SCENE
  }

  const breakdown = {
    script: SCRIPT_COST,
    tts: ttsCost,
    images: imagesCost,
    video_clips: videoClipsCost,
    composition: 0,
    metadata: METADATA_COST,
    total: SCRIPT_COST + ttsCost + imagesCost + videoClipsCost + METADATA_COST,
  }

  return { costUsd: breakdown.total, breakdown }
}

export function costToCredits(costUsd: number): number {
  // 1 credit = $0.05 (markup ~3-5x on cheap combos)
  return Math.max(1, Math.ceil(costUsd / 0.05))
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/shorts.ts src/lib/shorts-config.ts
git commit -m "feat: shorts types and cost estimation config"
```

---

### Task 3: Script generation service

**Files:**
- Create: `src/lib/shorts/generate-script.ts`

- [ ] **Step 1: Create script generator**

```typescript
// src/lib/shorts/generate-script.ts

import type { ShortLanguage, ShortFormat, ShortScene } from '@/types/shorts'

interface ScriptResult {
  title: string
  scenes: Array<{
    narration: string
    imagePrompt: string
    motion: string
  }>
  fullScript: string
}

const SYSTEM_PROMPT = `You are a viral short-form video scriptwriter. You create compelling, hook-driven scripts.
Rules:
- First scene MUST have a strong hook (question, surprising fact, bold claim)
- 5-8 scenes total
- Each scene narration: 15-20 words, conversational tone
- Image prompts: specific, cinematic, photorealistic, no text in images
- End with call-to-action or thought-provoking conclusion
- Total narration should fit in the requested duration when spoken
- Output ONLY valid JSON, no markdown code fences`

export async function generateScript(
  topic: string,
  language: ShortLanguage,
  format: ShortFormat,
  apiKey: string,
): Promise<ScriptResult> {
  const duration = format === 'short' ? 35 : 90
  const langLabel = language === 'pt-br' ? 'Brazilian Portuguese' : 'English'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studio.elabdata.com.br',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate a script for a ${duration}s ${format === 'short' ? 'vertical short' : 'landscape YouTube video'} about: "${topic}".
Language: ${langLabel}
Output JSON: { "title": "catchy title under 60 chars", "scenes": [{ "narration": "text to speak", "imagePrompt": "detailed image prompt", "motion": "zoom-in|zoom-out|pan-left|pan-right|ken-burns" }] }`,
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as {
    title: string
    scenes: Array<{ narration: string; imagePrompt: string; motion: string }>
  }

  const fullScript = parsed.scenes.map((s) => s.narration).join(' ')

  return { title: parsed.title, scenes: parsed.scenes, fullScript }
}

export function scenesToShortScenes(
  rawScenes: ScriptResult['scenes'],
  fps: number,
  totalDurationSec: number,
): ShortScene[] {
  const totalFrames = totalDurationSec * fps
  const framesPerScene = Math.floor(totalFrames / rawScenes.length)

  return rawScenes.map((scene, i) => ({
    index: i,
    text: scene.narration,
    imagePrompt: scene.imagePrompt,
    motion: scene.motion as ShortScene['motion'],
    durationFrames: framesPerScene,
    startFrame: i * framesPerScene,
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shorts/generate-script.ts
git commit -m "feat: shorts script generation via OpenRouter"
```

---

### Task 4: TTS provider abstraction

**Files:**
- Create: `src/lib/shorts/generate-narration.ts`

- [ ] **Step 1: Create TTS abstraction**

```typescript
// src/lib/shorts/generate-narration.ts

import type { TTSProvider } from '@/types/shorts'

interface NarrationResult {
  audioUrl: string
  durationSec: number
  costUsd: number
}

export async function generateNarration(
  text: string,
  provider: TTSProvider,
  language: string,
  falKey: string,
  openRouterKey: string,
): Promise<NarrationResult> {
  switch (provider) {
    case 'fal_ai':
      return generateFalTTS(text, language, falKey)
    case 'openai':
      return generateOpenAITTS(text, language, openRouterKey)
    case 'elevenlabs':
      throw new Error('ElevenLabs TTS requires ELEVENLABS_API_KEY — configure in settings')
    default:
      throw new Error(`Unknown TTS provider: ${provider}`)
  }
}

async function generateFalTTS(
  text: string,
  language: string,
  falKey: string,
): Promise<NarrationResult> {
  // Use f5-tts which supports multiple languages
  const response = await fetch('https://fal.run/fal-ai/f5-tts', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gen_text: text,
      ref_audio_url: 'https://github.com/SWivid/F5-TTS/raw/refs/heads/main/tests/ref_audio/test_en_1_ref_short.wav',
      model_type: 'F5-TTS',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`fal.ai TTS error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  const audioUrl = data.audio_url?.url ?? data.audio_url ?? ''
  // Estimate duration from word count (~150 words per minute)
  const wordCount = text.split(/\s+/).length
  const durationSec = Math.ceil((wordCount / 150) * 60)

  return { audioUrl, durationSec, costUsd: 0.02 }
}

async function generateOpenAITTS(
  text: string,
  language: string,
  openRouterKey: string,
): Promise<NarrationResult> {
  // OpenAI TTS via direct API (not available through OpenRouter chat completions)
  // Use fal.ai as fallback for now since OpenAI TTS needs direct API key
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: language === 'pt-br' ? 'nova' : 'onyx',
      response_format: 'mp3',
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI TTS error ${response.status}`)
  }

  // Response is raw audio, need to upload to Supabase Storage
  const audioBlob = await response.blob()
  const wordCount = text.split(/\s+/).length
  const durationSec = Math.ceil((wordCount / 150) * 60)

  // For MVP, return as data URL — orchestrator will upload to Supabase
  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const audioUrl = `data:audio/mp3;base64,${base64}`

  return { audioUrl, durationSec, costUsd: 0.015 }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shorts/generate-narration.ts
git commit -m "feat: TTS provider abstraction (fal.ai, OpenAI)"
```

---

### Task 5: Visual generation service

**Files:**
- Create: `src/lib/shorts/generate-visuals.ts`

- [ ] **Step 1: Create visuals generator**

```typescript
// src/lib/shorts/generate-visuals.ts

import type { ShortScene, VisualMode, ShortFormat } from '@/types/shorts'
import { IMAGE_COST_PER_SCENE, VIDEO_CLIP_COST_PER_SCENE } from '@/lib/shorts-config'

interface VisualsResult {
  scenes: ShortScene[]
  costUsd: number
}

export async function generateVisuals(
  scenes: ShortScene[],
  visualMode: VisualMode,
  format: ShortFormat,
  falKey: string,
): Promise<VisualsResult> {
  let totalCost = 0
  const updatedScenes = [...scenes]
  const size = format === 'short'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 }

  for (let i = 0; i < updatedScenes.length; i++) {
    const scene = updatedScenes[i]
    const useVideo = shouldUseVideo(i, updatedScenes.length, visualMode)

    if (useVideo) {
      // Generate image first, then image-to-video
      const imageUrl = await generateImage(scene.imagePrompt, size, falKey)
      // For MVP: just use the image. Video gen via webhook is a follow-up.
      // Video AI clips are expensive and slow — mark for async processing
      updatedScenes[i] = { ...scene, imageUrl, videoUrl: undefined }
      totalCost += IMAGE_COST_PER_SCENE + VIDEO_CLIP_COST_PER_SCENE
    } else {
      const imageUrl = await generateImage(scene.imagePrompt, size, falKey)
      updatedScenes[i] = { ...scene, imageUrl }
      totalCost += IMAGE_COST_PER_SCENE
    }
  }

  return { scenes: updatedScenes, costUsd: totalCost }
}

function shouldUseVideo(index: number, total: number, mode: VisualMode): boolean {
  if (mode === 'images') return false
  if (mode === 'video_ai') return true
  // hybrid: last 40% of scenes use video
  return index >= Math.ceil(total * 0.6)
}

async function generateImage(
  prompt: string,
  size: { width: number; height: number },
  falKey: string,
): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `${prompt}. Photorealistic, cinematic lighting, 8k quality. Do NOT include any text, words, or letters in the image.`,
      image_size: { width: size.width, height: size.height },
      num_images: 1,
      output_format: 'jpeg',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`FLUX Schnell error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.images?.[0]?.url ?? ''
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shorts/generate-visuals.ts
git commit -m "feat: visual generation for shorts (FLUX Schnell images)"
```

---

### Task 6: Platform metadata generation

**Files:**
- Create: `src/lib/shorts/generate-metadata.ts`

- [ ] **Step 1: Create metadata generator**

```typescript
// src/lib/shorts/generate-metadata.ts

import type { PlatformMetadata, ShortLanguage } from '@/types/shorts'

export async function generatePlatformMetadata(
  title: string,
  script: string,
  language: ShortLanguage,
  apiKey: string,
): Promise<{ metadata: PlatformMetadata; costUsd: number }> {
  const langLabel = language === 'pt-br' ? 'Brazilian Portuguese' : 'English'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studio.elabdata.com.br',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-20250514',
      messages: [
        {
          role: 'system',
          content: `You are a social media expert. Generate platform-specific metadata for a short video. Output ONLY valid JSON, no code fences. Language: ${langLabel}`,
        },
        {
          role: 'user',
          content: `Video title: "${title}"
Script: "${script}"

Output JSON with this exact structure:
{
  "youtube": { "title": "SEO optimized title max 100 chars", "description": "2-3 paragraphs with keywords", "tags": ["tag1", "tag2", ...up to 15], "category": "Science & Technology" },
  "instagram": { "caption": "engaging caption with emojis max 300 chars", "hashtags": ["#tag1", "#tag2", ...up to 20] },
  "tiktok": { "caption": "short punchy caption max 150 chars", "hashtags": ["#tag1", "#fyp", ...up to 10] }
}`,
        },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter metadata error ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'
  const metadata = JSON.parse(content) as PlatformMetadata

  return { metadata, costUsd: 0.005 }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/shorts/generate-metadata.ts
git commit -m "feat: platform metadata generation (YouTube, Instagram, TikTok)"
```

---

### Task 7: Remotion FacelessShort composition

**Files:**
- Create: `src/remotion/compositions/FacelessShort.tsx`
- Modify: `src/remotion/Root.tsx`

- [ ] **Step 1: Create FacelessShort composition**

```typescript
// src/remotion/compositions/FacelessShort.tsx

import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion'
import { AnimatedCaption } from '../components/AnimatedCaption'
import type { CaptionStyleName } from '@/types/project'

export interface FacelessScene {
  imageUrl?: string
  videoUrl?: string
  durationFrames: number
  startFrame: number
  motion: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'none'
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
  format: 'short' | 'normal'
  brandName?: string
  showProgressBar?: boolean
  totalFrames: number
}

const CROSSFADE_FRAMES = 10

function SceneRenderer({ scene }: { scene: FacelessScene }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const localFrame = frame - scene.startFrame
  const progress = scene.durationFrames > 0 ? localFrame / scene.durationFrames : 0

  // Ken burns / motion effects
  let scale = 1
  let translateX = 0
  let translateY = 0

  switch (scene.motion) {
    case 'zoom-in':
      scale = interpolate(progress, [0, 1], [1, 1.15], { extrapolateRight: 'clamp' })
      break
    case 'zoom-out':
      scale = interpolate(progress, [0, 1], [1.15, 1], { extrapolateRight: 'clamp' })
      break
    case 'pan-left':
      translateX = interpolate(progress, [0, 1], [0, -width * 0.05], { extrapolateRight: 'clamp' })
      scale = 1.1
      break
    case 'pan-right':
      translateX = interpolate(progress, [0, 1], [-width * 0.05, 0], { extrapolateRight: 'clamp' })
      scale = 1.1
      break
    case 'ken-burns':
      scale = interpolate(progress, [0, 1], [1, 1.12], { extrapolateRight: 'clamp' })
      translateX = interpolate(progress, [0, 1], [0, -width * 0.02], { extrapolateRight: 'clamp' })
      translateY = interpolate(progress, [0, 1], [0, -height * 0.01], { extrapolateRight: 'clamp' })
      break
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
    transformOrigin: 'center center',
  }

  if (scene.videoUrl) {
    return (
      <div style={style}>
        <OffthreadVideo
          src={scene.videoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  if (scene.imageUrl) {
    return (
      <div style={style}>
        <Img
          src={scene.imageUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return <div style={{ ...style, background: '#111' }} />
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

  // Find active caption
  const activeCaption = captions.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame,
  )

  // Progress bar
  const progress = totalFrames > 0 ? frame / totalFrames : 0

  // Brand intro (first 30 frames)
  const INTRO_FRAMES = 30
  const brandOpacity = interpolate(
    frame,
    [0, INTRO_FRAMES * 0.5, INTRO_FRAMES, INTRO_FRAMES + 10],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const brandScale = frame < INTRO_FRAMES
    ? spring({ fps, frame, config: { damping: 14, stiffness: 200, mass: 0.8 }, from: 0.5, to: 1 })
    : 1

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* Scenes with crossfade */}
      {scenes.map((scene, i) => {
        const sceneEnd = scene.startFrame + scene.durationFrames
        const opacity = interpolate(
          frame,
          [
            scene.startFrame,
            scene.startFrame + CROSSFADE_FRAMES,
            sceneEnd - CROSSFADE_FRAMES,
            sceneEnd,
          ],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )

        if (frame < scene.startFrame - CROSSFADE_FRAMES || frame > sceneEnd + CROSSFADE_FRAMES) {
          return null
        }

        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <SceneRenderer scene={scene} />
          </AbsoluteFill>
        )
      })}

      {/* Audio narration */}
      <Audio src={audioUrl} />

      {/* Dark gradient scrim for captions */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Progress bar */}
      {showProgressBar && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.2)', zIndex: 30 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: '#22c55e', borderRadius: '0 2px 2px 0' }} />
        </div>
      )}

      {/* Brand intro */}
      {brandName && (
        <div style={{ position: 'absolute', top: height * 0.35, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: brandOpacity, transform: `scale(${brandScale})`, zIndex: 25 }}>
          <div style={{ color: '#fff', fontSize: 64, fontWeight: 900, fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-2px', textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
            {brandName}
          </div>
        </div>
      )}

      {/* Captions */}
      {activeCaption && (
        <div style={{ position: 'absolute', bottom: height * 0.15, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: `0 ${width * 0.06}px`, zIndex: 20 }}>
          {activeCaption.words && activeCaption.words.length > 0 ? (
            <AnimatedCaption words={activeCaption.words} captionStyle={captionStyle} />
          ) : (
            <div style={{ color: '#fff', fontSize: 52, fontWeight: 800, fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 2px 12px rgba(0,0,0,0.9)', textAlign: 'center' }}>
              {activeCaption.text}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 2: Register in Root.tsx**

Add to `src/remotion/Root.tsx` — import FacelessShort and add a new `<Composition>`:

```tsx
import { FacelessShort as FacelessShortImpl } from './compositions/FacelessShort'

// Add cast (same pattern as existing)
const FacelessShort = FacelessShortImpl as ComponentType<any>

// Add inside RemotionRoot return, after the SocialClip composition:
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
```

- [ ] **Step 3: Commit**

```bash
git add src/remotion/compositions/FacelessShort.tsx src/remotion/Root.tsx
git commit -m "feat: FacelessShort Remotion composition with ken burns + crossfade"
```

---

### Task 8: Cost estimate API route

**Files:**
- Create: `src/app/api/ai/shorts/estimate/route.ts`

- [ ] **Step 1: Create estimate endpoint**

```typescript
// src/app/api/ai/shorts/estimate/route.ts

import { NextResponse } from 'next/server'
import { estimateCost, costToCredits, SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import { createSupabaseServer } from '@/lib/supabase-server'
import type { VisualMode, TTSProvider } from '@/types/shorts'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json() as {
      visualMode: VisualMode
      ttsProvider: TTSProvider
      sceneCount?: number
      format?: string
    }

    const { visualMode, ttsProvider, sceneCount = 6 } = body
    const { costUsd, breakdown } = estimateCost(visualMode, ttsProvider, sceneCount)
    const credits = costToCredits(costUsd)

    const isAdmin = user.email === SUPER_ADMIN_EMAIL
    const wordCount = sceneCount * 17 // avg 17 words per scene
    const durationSec = Math.ceil((wordCount / 150) * 60) // ~150 wpm

    return NextResponse.json({
      estimatedCredits: credits,
      estimatedDurationSec: durationSec,
      ...(isAdmin ? { estimatedCostUsd: costUsd, breakdown } : {}),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/shorts/estimate/route.ts
git commit -m "feat: shorts cost estimate API"
```

---

### Task 9: Topic suggestion API route

**Files:**
- Create: `src/app/api/ai/shorts/suggest-topics/route.ts`

- [ ] **Step 1: Create topic suggestion endpoint**

```typescript
// src/app/api/ai/shorts/suggest-topics/route.ts

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { niche = 'tech', language = 'en', count = 5 } = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ''

    const langLabel = language === 'pt-br' ? 'Brazilian Portuguese' : 'English'

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [
          {
            role: 'user',
            content: `Suggest ${count} viral short video topics about "${niche}". Each should be a specific, surprising angle that would hook viewers in the first second. Language: ${langLabel}. Output ONLY a JSON array of strings: ["topic1", "topic2", ...]`,
          },
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter error ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? '[]'
    const parsed = JSON.parse(content)
    const topics = Array.isArray(parsed) ? parsed : parsed.topics ?? []

    return NextResponse.json({ topics })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/shorts/suggest-topics/route.ts
git commit -m "feat: AI topic suggestion endpoint for shorts"
```

---

### Task 10: Shorts orchestrator API route

**Files:**
- Create: `src/app/api/ai/shorts/route.ts`
- Create: `src/app/api/ai/shorts/[id]/route.ts`

- [ ] **Step 1: Create main orchestrator**

```typescript
// src/app/api/ai/shorts/route.ts

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { generateScript, scenesToShortScenes } from '@/lib/shorts/generate-script'
import { generateNarration } from '@/lib/shorts/generate-narration'
import { generateVisuals } from '@/lib/shorts/generate-visuals'
import { generatePlatformMetadata } from '@/lib/shorts/generate-metadata'
import { estimateCost, SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'
import type { CreateShortRequest, ShortRecord } from '@/types/shorts'

const FPS = 30

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const body = await req.json() as CreateShortRequest
    const { topic, language, format, visualMode, ttsProvider, captionStyle = 'bold', customScript } = body

    if (!topic && !customScript) {
      return NextResponse.json({ error: 'topic ou customScript obrigatorio' }, { status: 400 })
    }

    const admin = createSupabaseAdmin()
    const openRouterKey = process.env.OPENROUTER_API_KEY ?? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ''
    const falKey = process.env.FAL_AI_KEY ?? ''

    // Create initial record
    const { data: short, error: insertError } = await admin
      .from('shorts')
      .insert({
        user_id: user.id,
        title: topic || 'Custom Script',
        language,
        format,
        visual_mode: visualMode,
        tts_provider: ttsProvider,
        caption_style: captionStyle,
        status: 'generating_script',
      })
      .select('id')
      .single()

    if (insertError || !short) {
      return NextResponse.json({ error: 'Erro ao criar short' }, { status: 500 })
    }

    // Return immediately, process async
    const shortId = short.id
    processShort(shortId, body, user.id, openRouterKey, falKey, admin).catch((err) => {
      console.error(`[shorts] pipeline error for ${shortId}:`, err)
      admin.from('shorts').update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Erro desconhecido',
      }).eq('id', shortId).then(() => {})
    })

    return NextResponse.json({ shortId, status: 'generating_script' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

async function processShort(
  shortId: string,
  request: CreateShortRequest,
  userId: string,
  openRouterKey: string,
  falKey: string,
  admin: ReturnType<typeof createSupabaseAdmin>,
) {
  const costBreakdown = { script: 0, tts: 0, images: 0, video_clips: 0, composition: 0, metadata: 0, total: 0 }
  const { topic, language, format, visualMode, ttsProvider, captionStyle = 'bold', customScript } = request
  const durationSec = format === 'short' ? 35 : 90

  // ── Stage 1: Script ──
  let title: string
  let scenes: ReturnType<typeof scenesToShortScenes>
  let fullScript: string

  if (customScript) {
    title = topic || 'Custom Script'
    fullScript = customScript
    // Split custom script into ~6 scenes
    const words = customScript.split(/\s+/)
    const wordsPerScene = Math.ceil(words.length / 6)
    const rawScenes = []
    for (let i = 0; i < words.length; i += wordsPerScene) {
      const chunk = words.slice(i, i + wordsPerScene).join(' ')
      rawScenes.push({ narration: chunk, imagePrompt: `Cinematic scene illustrating: ${chunk}`, motion: 'ken-burns' })
    }
    scenes = scenesToShortScenes(rawScenes, FPS, durationSec)
  } else {
    const scriptResult = await generateScript(topic, language, format, openRouterKey)
    title = scriptResult.title
    fullScript = scriptResult.fullScript
    scenes = scenesToShortScenes(scriptResult.scenes, FPS, durationSec)
    costBreakdown.script = 0.01
  }

  await admin.from('shorts').update({
    title,
    script: fullScript,
    scenes,
    status: 'generating_audio',
  }).eq('id', shortId)

  // ── Stage 2: Audio ──
  const narration = await generateNarration(fullScript, ttsProvider, language, falKey, openRouterKey)
  costBreakdown.tts = narration.costUsd

  // Recalculate scene durations based on actual audio length
  const totalFrames = narration.durationSec * FPS
  const framesPerScene = Math.floor(totalFrames / scenes.length)
  scenes = scenes.map((s, i) => ({
    ...s,
    durationFrames: framesPerScene,
    startFrame: i * framesPerScene,
  }))

  // Build captions (one per scene for MVP)
  const captions = scenes.map((s) => ({
    text: s.text,
    startFrame: s.startFrame,
    endFrame: s.startFrame + s.durationFrames,
  }))

  await admin.from('shorts').update({
    narration_url: narration.audioUrl,
    scenes,
    captions,
    status: 'generating_visuals',
  }).eq('id', shortId)

  // ── Stage 3: Visuals ──
  const visuals = await generateVisuals(scenes, visualMode, format, falKey)
  costBreakdown.images = visuals.costUsd
  scenes = visuals.scenes

  await admin.from('shorts').update({
    scenes,
    status: 'composing',
  }).eq('id', shortId)

  // ── Stage 4: Composition ──
  // For MVP: skip Remotion server-side render (needs CLI setup on VPS)
  // Mark as completed with scenes + audio — frontend can preview via Remotion Player
  // TODO: Add server-side Remotion render in follow-up task

  await admin.from('shorts').update({
    status: 'generating_metadata',
  }).eq('id', shortId)

  // ── Stage 5: Metadata ──
  const meta = await generatePlatformMetadata(title, fullScript, language, openRouterKey)
  costBreakdown.metadata = meta.costUsd

  // Calculate total
  costBreakdown.total = Object.values(costBreakdown).reduce((a, b) => a + b, 0)

  await admin.from('shorts').update({
    platform_metadata: meta.metadata,
    cost_usd: costBreakdown.total,
    cost_breakdown: costBreakdown,
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', shortId)
}

// GET: list shorts
export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()
    const { data: shorts, error } = await admin
      .from('shorts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar shorts' }, { status: 500 })
    }

    // Strip cost fields for non-admin
    const isAdmin = user.email === SUPER_ADMIN_EMAIL
    const result = isAdmin
      ? shorts
      : shorts?.map((s: ShortRecord) => ({ ...s, cost_usd: undefined, cost_breakdown: undefined }))

    return NextResponse.json({ shorts: result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 2: Create single short + delete endpoint**

```typescript
// src/app/api/ai/shorts/[id]/route.ts

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const admin = createSupabaseAdmin()
    const { data: short, error } = await admin
      .from('shorts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !short) {
      return NextResponse.json({ error: 'Short nao encontrado' }, { status: 404 })
    }

    const isAdmin = user.email === SUPER_ADMIN_EMAIL
    if (!isAdmin) {
      short.cost_usd = undefined
      short.cost_breakdown = undefined
    }

    return NextResponse.json(short)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    const { id } = await params
    const admin = createSupabaseAdmin()

    // Get short to find storage files
    const { data: short } = await admin
      .from('shorts')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!short) {
      return NextResponse.json({ error: 'Short nao encontrado' }, { status: 404 })
    }

    // Delete storage files
    const storagePath = `shorts/${user.id}/${id}`
    await admin.storage.from('media').remove([
      `${storagePath}/audio.mp3`,
      `${storagePath}/video.mp4`,
      `${storagePath}/thumb.jpg`,
    ])

    // Delete DB record
    await admin.from('shorts').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/shorts/route.ts src/app/api/ai/shorts/\[id\]/route.ts
git commit -m "feat: shorts orchestrator API + CRUD endpoints"
```

---

### Task 11: Frontend — `/shorts` page

**Files:**
- Create: `src/app/(dashboard)/shorts/page.tsx`
- Modify: `src/app/page.tsx` (add dashboard card)

- [ ] **Step 1: Create the shorts page**

This is a large file. Create `src/app/(dashboard)/shorts/page.tsx` with:

1. **State**: step (1-4), topic, language, format, visualMode, ttsProvider, captionStyle, customScript toggle, generatedScript, scenes, costEstimate, shortId, shorts list, polling
2. **Step 1 (Topic)**: text input, "Sugerir Temas" button that calls `/api/ai/shorts/suggest-topics` and shows chips, language toggle (PT-BR | EN), "Usar script proprio" toggle with textarea
3. **Step 2 (Config)**: card selectors for format (Short 9:16 / Normal 16:9), visual mode (3 cards with descriptions + cost hint), TTS provider (3 cards), caption style (4 options)
4. **Step 3 (Preview)**: shows generated script (editable textarea), scene list with image prompts, cost estimate (calls `/api/ai/shorts/estimate`), "Gerar Short" button
5. **Step 4 (Result)**: video element or Remotion Player, tabs for YouTube/Instagram/TikTok metadata with copy buttons, Download/Publish/Delete buttons
6. **Gallery below**: grid of past shorts with thumbnail, title, status badge, duration, size, delete button
7. **Polling**: when a short is in progress, poll `/api/ai/shorts/{id}` every 3 seconds

Style: dark theme matching `/photos` page. Use same card patterns, badges, loading spinners. Import lucide icons.

Due to size, this file should be written directly — it follows the exact patterns from the existing `/photos/page.tsx` (tabs, cards, loading states, etc).

- [ ] **Step 2: Add dashboard card**

In `src/app/page.tsx`, add to the `modules` array:

```typescript
{
  title: "Gerador de Shorts",
  description: "Crie shorts virais com IA",
  icon: Film, // import Film from lucide-react
  href: "/shorts",
  color: "from-purple-500/20 to-purple-600/5",
  borderColor: "border-purple-500/30",
  module: "shorts",
},
```

Add `Film` to the lucide import at the top of the file.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/shorts/page.tsx src/app/page.tsx
git commit -m "feat: shorts generator page with wizard + gallery + dashboard card"
```

---

### Task 12: Type check and integration test

**Files:** None new — verification only

- [ ] **Step 1: Run type checker**

```bash
npx tsc --noEmit --pretty
```

Expected: zero errors

- [ ] **Step 2: Test estimate endpoint manually**

```bash
curl -X POST http://localhost:3000/api/ai/shorts/estimate \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"visualMode":"images","ttsProvider":"fal_ai","sceneCount":6}'
```

Expected: JSON with `estimatedCredits` and optionally `estimatedCostUsd` (admin only)

- [ ] **Step 3: Test topic suggestion**

```bash
curl -X POST http://localhost:3000/api/ai/shorts/suggest-topics \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"niche":"tech","language":"en","count":5}'
```

Expected: JSON with `topics` array of 5 strings

- [ ] **Step 4: Final commit and push**

```bash
git push origin main
```
