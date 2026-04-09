# Shorts Pipeline — Design Spec

**Date:** 2026-04-09
**Status:** Approved
**Goal:** Replace BigMotion ($40+/mo) with an in-app AI shorts pipeline supporting PT-BR and EN, faceless and avatar formats, with full publishing workflow.

---

## 1. Overview

A complete pipeline for generating short-form videos (30-60s) from a text topic. The user picks a theme (or gets AI suggestions), configures visual mode, TTS provider, and language, then the system generates script → narration → visuals → composites everything via Remotion → outputs video + platform-specific descriptions and hashtags.

### Key requirements
- Languages: PT-BR and EN
- Formats: Short (1080x1920, 9:16) and Normal (1920x1080, 16:9)
- 3 visual modes: Images (ken burns), Video AI clips, Hybrid
- 3 TTS providers: fal.ai, ElevenLabs, OpenAI TTS
- Dynamic cost estimate before generation
- Cost visible only to super admin; users see credits
- Download, publish to socials, save, delete (free storage)
- Platform-specific descriptions + hashtags (YouTube, Instagram, TikTok)

---

## 2. Data Model

### 2.1 Table: `shorts`

```sql
create table shorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references ai_jobs(id) on delete set null,
  title text not null,
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
```

### 2.2 `platform_metadata` structure

```json
{
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["tag1", "tag2"],
    "category": "Science & Technology"
  },
  "instagram": {
    "caption": "...",
    "hashtags": ["#tech", "#innovation"]
  },
  "tiktok": {
    "caption": "...",
    "hashtags": ["#tech", "#fyp"]
  }
}
```

### 2.3 `scenes` structure

```json
[
  {
    "index": 0,
    "text": "Narration text for this scene",
    "imageUrl": "https://...",
    "videoUrl": null,
    "motion": "zoom-in",
    "durationFrames": 90,
    "startFrame": 0
  }
]
```

### 2.4 `cost_breakdown` structure (super admin only)

```json
{
  "script": 0.01,
  "tts": 0.03,
  "images": 0.024,
  "video_clips": 0,
  "composition": 0,
  "metadata": 0.005,
  "total": 0.069
}
```

### 2.5 Pricing/credits (future-ready)

- `cost_usd` and `cost_breakdown` are server-side only, never returned to non-admin users
- `credits_charged` is what the user sees
- Future `pricing_rules` table will define markup per combination
- Admin panel will have a Pricing section to configure markup and per-plan limits

---

## 3. API Routes

### 3.1 `POST /api/ai/shorts` — Create short (orchestrator)

**Request:**
```json
{
  "topic": "iPhone storage full fix tips",
  "language": "pt-br",
  "format": "short",
  "visualMode": "images",
  "ttsProvider": "fal_ai",
  "captionStyle": "bold",
  "customScript": null
}
```

**Response (immediate):**
```json
{
  "shortId": "uuid",
  "status": "generating_script"
}
```

**Orchestration flow (async, updates status in Supabase):**

1. **generating_script** — Call OpenRouter (Claude Sonnet) to generate:
   - Script broken into 5-8 scenes (~15-20 words each)
   - Scene-level image prompts
   - Video title
   - Save to `shorts.script` and `shorts.scenes`

2. **generating_audio** — Call TTS provider:
   - fal.ai: `POST fal.run/fal-ai/playai/tts/v3` (or best available)
   - ElevenLabs: direct API call
   - OpenAI: via OpenRouter or direct
   - Get audio duration, calculate frames per scene
   - Save to `shorts.narration_url`

3. **generating_visuals** — Based on visual_mode:
   - **images**: Call `fal.run/fal-ai/flux/schnell` for each scene ($0.003/img)
   - **video_ai**: Call `fal.run/fal-ai/kling-video/v2/master/image-to-video` or similar via webhook ($0.50+/clip)
   - **hybrid**: First 60% scenes as images, last 40% as video clips
   - Save URLs to `shorts.scenes[].imageUrl` or `videoUrl`

4. **composing** — Render via Remotion:
   - Use `FacelessShort` composition
   - Pass scenes, audio, captions
   - Render server-side or via Remotion Lambda
   - Save to `shorts.video_url`
   - Generate thumbnail from first frame → `shorts.thumbnail_url`

5. **generating_metadata** — Call OpenRouter to generate:
   - YouTube title, description, tags
   - Instagram caption + hashtags
   - TikTok caption + hashtags
   - Save to `shorts.platform_metadata`

6. **completed** — Update status, `completed_at`, `file_size_mb`

### 3.2 `GET /api/ai/shorts` — List user's shorts

Returns array of shorts for authenticated user. If super admin, includes `cost_usd` and `cost_breakdown`. Otherwise those fields are stripped.

### 3.3 `GET /api/ai/shorts/[id]` — Get single short

Full short data. Cost fields stripped for non-admin.

### 3.4 `DELETE /api/ai/shorts/[id]` — Delete short

Deletes from Supabase + removes video/images from Supabase Storage. Frees space.

### 3.5 `POST /api/ai/shorts/estimate` — Cost estimate

**Request:**
```json
{
  "visualMode": "images",
  "ttsProvider": "fal_ai",
  "sceneCount": 6,
  "format": "short"
}
```

**Response:**
```json
{
  "estimatedCostUsd": 0.069,
  "breakdown": {
    "script": 0.01,
    "tts": 0.03,
    "images": 0.018,
    "composition": 0,
    "metadata": 0.005
  },
  "estimatedCredits": 1,
  "estimatedDurationSec": 45
}
```

Only super admin sees `estimatedCostUsd` and `breakdown`. Regular users see `estimatedCredits` only.

### 3.6 `POST /api/ai/shorts/suggest-topics` — AI topic suggestions

**Request:** `{ "niche": "tech", "language": "en", "count": 5 }`
**Response:** `{ "topics": ["...", "..."] }`

---

## 4. Remotion Composition: `FacelessShort`

New file: `src/remotion/compositions/FacelessShort.tsx`

### Props

```typescript
interface FacelessShortProps {
  scenes: Array<{
    imageUrl?: string
    videoUrl?: string
    durationFrames: number
    startFrame: number
    motion: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns' | 'none'
  }>
  audioUrl: string
  captions: CaptionSegment[]  // reuse existing type
  captionStyle: CaptionStyleName
  format: 'short' | 'normal'
  brandName?: string
  showProgressBar?: boolean
  totalFrames: number
}
```

### Rendering behavior

- Each scene renders its image/video for `durationFrames` frames
- Images get ken burns effect (scale from 1.0→1.15 + translate) via Remotion `interpolate`
- Video clips play inline via `OffthreadVideo`
- Crossfade transition (10 frames) between scenes
- Audio plays via `<Audio src={audioUrl} />`
- Captions rendered via existing `AnimatedCaption` component
- Progress bar at top (reused from SocialClip)
- Optional brand name intro (reused from SocialClip)

### Registration in Root.tsx

```tsx
<Composition
  id="FacelessShort"
  component={FacelessShort}
  durationInFrames={900}  // 30s at 30fps, overridden at render time
  fps={30}
  width={1080}
  height={1920}
  defaultProps={{ ... }}
/>
```

---

## 5. Frontend: `/shorts` Page

### Layout

Full-page wizard with persistent gallery below.

### Step 1: Theme/Script

- Large text input for topic
- Button "Sugerir Temas" → calls `/api/ai/shorts/suggest-topics`, shows 5 clickable chips
- Toggle "Usar script próprio" → shows textarea for pasting full script
- Language selector: PT-BR | EN

### Step 2: Configuration

Card-based selectors (similar to photos upscale UI):

**Formato:**
- Short (9:16) — TikTok, Reels, Shorts
- Normal (16:9) — YouTube

**Visual:**
- Imagens + Motion — rápido, barato (~$0.02)
- Vídeo AI — dinâmico, mais caro (~$1-4)
- Híbrido — mix dos dois (~$0.80-1.50)

**Narração:**
- fal.ai TTS — rápido, barato
- ElevenLabs — mais natural, clonagem de voz
- OpenAI TTS — boa qualidade, simples

**Legenda:** bold | outline | karaoke (existing styles)

### Step 3: Preview + Custo

- Script gerado (editável)
- Cenas listadas com prompts de imagem (editáveis)
- Estimativa de custo (créditos pra user, USD pra admin)
- Botão "Gerar Short" (grande, destaque)

### Step 4: Resultado

- Video player inline
- Tabs: YouTube | Instagram | TikTok — cada uma com título/descrição/hashtags editáveis + botão copiar
- Botões: Download MP4 | Publicar (via existing social publish API) | Apagar
- Info: duração, tamanho do arquivo, custo (admin only)

### Gallery (below wizard)

- Grid de shorts gerados
- Thumbnail + título + status badge + duração + tamanho
- Botão apagar (com confirmação, mostra espaço que vai liberar)
- Filtro por status: todos | completos | em progresso | falhou

---

## 6. TTS Provider Integration

### fal.ai TTS
- Endpoint: check available at `fal.run/fal-ai/playai/tts/v3` or `fal-ai/f5-tts`
- Input: text, voice_id, language
- Output: audio URL (wav/mp3)
- Cost: ~$0.01-0.03

### ElevenLabs (future, needs API key)
- Endpoint: `api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- Supports voice cloning (Rafael's voice for PT-BR avatar)
- Cost: ~$0.03-0.10

### OpenAI TTS
- Via OpenRouter: model `openai/tts-1` or direct
- Voices: alloy, echo, fable, onyx, nova, shimmer
- Cost: ~$0.015

Each provider is abstracted behind a `generateNarration(text, provider, options)` function.

---

## 7. Script Generation Prompt

System prompt for OpenRouter (Claude Sonnet):

```
You are a viral short-form video scriptwriter. Generate a script for a {duration}s {format} video about: "{topic}".

Language: {language}
Output JSON:
{
  "title": "catchy title under 60 chars",
  "scenes": [
    {
      "narration": "text to be spoken (15-20 words max)",
      "imagePrompt": "detailed prompt for AI image generation, photorealistic style",
      "motion": "zoom-in|zoom-out|pan-left|pan-right|ken-burns"
    }
  ]
}

Rules:
- First scene MUST have a strong hook (question, surprising fact, bold claim)
- 5-8 scenes total
- Each scene narration: 15-20 words, conversational tone
- Image prompts: specific, cinematic, no text in images
- End with call-to-action or thought-provoking conclusion
- Total narration should fit in {duration} seconds when spoken
```

---

## 8. Storage Strategy

- Narration audio: Supabase Storage bucket `media` (existing)
- Generated images: Supabase Storage bucket `media`
- Final video: Supabase Storage bucket `media`
- Thumbnail: Supabase Storage bucket `media`
- Path pattern: `shorts/{user_id}/{short_id}/[audio.mp3|scene_0.png|video.mp4|thumb.jpg]`
- Delete cascade: when short is deleted, remove all files from storage

---

## 9. Rendering Strategy

Remotion rendering options:

**A) Server-side CLI render** — `npx remotion render` on the VPS. Free, but slow and blocks the server.

**B) Remotion Lambda** — render on AWS Lambda. Fast, parallel, pay-per-render (~$0.01-0.05). Needs AWS setup.

**C) Client-side render** — render in browser via `renderMedia`. Free, but slow and blocks the user's browser.

**Recommended for MVP:** Option A (server-side CLI). The VPS has resources for it, shorts are only 30-60s so render time is manageable (~30-60s to render). Upgrade to Lambda later for scale.

The render step calls:
```bash
npx remotion render FacelessShort --props='<json>' --output=output.mp4
```

---

## 10. Dashboard Integration

- New card on dashboard: "Gerador de Shorts" with video icon, description "Crie shorts virais com IA"
- Links to `/shorts`
- Badge showing count of shorts in progress (if any)

---

## 11. Admin Panel Extension

Add to `/admin` (future centralized panel):

**Shorts section:**
- Total shorts generated (all users)
- Cost breakdown by provider
- Most used combinations (visual mode + TTS)
- Storage usage
- Per-user generation count

**Pricing section (future):**
- Markup configuration per combination
- Credits-per-video rules
- Per-plan limits (Free: 2/month, Pro: 50, Business: unlimited)
