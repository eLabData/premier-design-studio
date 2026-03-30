'use client'

import type { Platform } from '@/types/project'

export interface Template {
  id: string
  name: string
  category: string
  platform: Platform
  format: string
  width: number
  height: number
  fabricJSON: string
}

// 10 templates — 2 per category
export const TEMPLATES: Template[] = [
  // ── Instagram Feed ────────────────────────────────────────────────────────
  {
    id: 'ig-feed-1',
    name: 'Feed Escuro',
    category: 'Instagram Feed',
    platform: 'instagram',
    format: 'feed',
    width: 1080,
    height: 1080,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1080, height: 1080,
          fill: '#111111', selectable: false, evented: false,
        },
        {
          type: 'rect',
          id: 'accent',
          left: 80, top: 700, width: 6, height: 200,
          fill: '#22c55e', selectable: false,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'Seu Título\nAqui',
          left: 110, top: 680,
          fontFamily: 'Arial', fontSize: 96, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1.1,
        },
        {
          type: 'i-text',
          id: 'subtitle',
          text: 'Descrição curta e objetiva',
          left: 110, top: 900,
          fontFamily: 'Arial', fontSize: 38, fontWeight: 'normal',
          fill: '#aaaaaa',
        },
        {
          type: 'i-text',
          id: 'tag',
          text: '@seuusuario',
          left: 110, top: 40,
          fontFamily: 'Arial', fontSize: 32,
          fill: '#22c55e',
        },
      ],
      background: '#111111',
    }),
  },
  {
    id: 'ig-feed-2',
    name: 'Feed Gradiente',
    category: 'Instagram Feed',
    platform: 'instagram',
    format: 'feed',
    width: 1080,
    height: 1080,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1080, height: 1080,
          fill: { type: 'linear', coords: { x1: 0, y1: 0, x2: 1080, y2: 1080 }, colorStops: [{ offset: 0, color: '#0f172a' }, { offset: 1, color: '#14532d' }] },
          selectable: false,
        },
        {
          type: 'circle',
          id: 'dec',
          left: 700, top: -100, radius: 400,
          fill: 'rgba(34,197,94,0.08)', selectable: false,
        },
        {
          type: 'i-text',
          id: 'tag',
          text: 'NOVIDADE',
          left: 90, top: 90,
          fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold',
          fill: '#22c55e', charSpacing: 200,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'Título do\nPost Aqui',
          left: 90, top: 400,
          fontFamily: 'Arial', fontSize: 120, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1.05,
        },
        {
          type: 'rect',
          id: 'line',
          left: 90, top: 720, width: 80, height: 5,
          fill: '#22c55e',
        },
        {
          type: 'i-text',
          id: 'sub',
          text: 'Subtítulo descritivo da publicação',
          left: 90, top: 750,
          fontFamily: 'Arial', fontSize: 36,
          fill: '#94a3b8',
        },
      ],
      background: '#0f172a',
    }),
  },

  // ── Instagram Story ───────────────────────────────────────────────────────
  {
    id: 'ig-story-1',
    name: 'Story Bold',
    category: 'Instagram Story',
    platform: 'instagram',
    format: 'story',
    width: 1080,
    height: 1920,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1080, height: 1920,
          fill: '#0a0a0a', selectable: false,
        },
        {
          type: 'rect',
          id: 'bar',
          left: 0, top: 1600, width: 1080, height: 320,
          fill: '#22c55e', selectable: false,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'TÍTULO\nIMPACTANTE',
          left: 80, top: 600,
          fontFamily: 'Arial', fontSize: 130, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1, charSpacing: -20,
        },
        {
          type: 'i-text',
          id: 'cta',
          text: 'Arraste para cima ↑',
          left: 80, top: 1680,
          fontFamily: 'Arial', fontSize: 44,
          fill: '#000000', fontWeight: 'bold',
        },
        {
          type: 'i-text',
          id: 'username',
          text: '@seuusuario',
          left: 80, top: 80,
          fontFamily: 'Arial', fontSize: 38,
          fill: '#aaaaaa',
        },
      ],
      background: '#0a0a0a',
    }),
  },
  {
    id: 'ig-story-2',
    name: 'Story Minimalista',
    category: 'Instagram Story',
    platform: 'instagram',
    format: 'story',
    width: 1080,
    height: 1920,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1080, height: 1920,
          fill: '#f8fafc', selectable: false,
        },
        {
          type: 'rect',
          id: 'top',
          left: 0, top: 0, width: 1080, height: 8,
          fill: '#22c55e', selectable: false,
        },
        {
          type: 'i-text',
          id: 'label',
          text: 'DICA DO DIA',
          left: 90, top: 200,
          fontFamily: 'Arial', fontSize: 36, fontWeight: 'bold',
          fill: '#22c55e', charSpacing: 200,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'Mensagem\nPrincipal\nAqui',
          left: 90, top: 300,
          fontFamily: 'Georgia', fontSize: 110, fontWeight: 'bold',
          fill: '#0f172a', lineHeight: 1.1,
        },
        {
          type: 'i-text',
          id: 'body',
          text: 'Texto explicativo mais longo que\nacompanha o conteúdo principal.',
          left: 90, top: 900,
          fontFamily: 'Arial', fontSize: 44,
          fill: '#64748b', lineHeight: 1.4,
        },
        {
          type: 'i-text',
          id: 'cta',
          text: '→ Saiba mais',
          left: 90, top: 1720,
          fontFamily: 'Arial', fontSize: 44, fontWeight: 'bold',
          fill: '#22c55e',
        },
      ],
      background: '#f8fafc',
    }),
  },

  // ── YouTube Thumbnail ─────────────────────────────────────────────────────
  {
    id: 'yt-thumb-1',
    name: 'Thumb Impacto',
    category: 'YouTube Thumbnail',
    platform: 'youtube',
    format: 'thumbnail',
    width: 1280,
    height: 720,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1280, height: 720,
          fill: '#111111', selectable: false,
        },
        {
          type: 'rect',
          id: 'accent',
          left: 0, top: 0, width: 1280, height: 10,
          fill: '#ef4444', selectable: false,
        },
        {
          type: 'i-text',
          id: 'number',
          text: '10',
          left: 40, top: 40,
          fontFamily: 'Arial', fontSize: 280, fontWeight: 'bold',
          fill: 'rgba(239,68,68,0.15)',
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'TÍTULO DO\nVÍDEO AQUI',
          left: 60, top: 200,
          fontFamily: 'Arial', fontSize: 120, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1, charSpacing: -10,
        },
        {
          type: 'i-text',
          id: 'sub',
          text: 'subtítulo complementar',
          left: 60, top: 560,
          fontFamily: 'Arial', fontSize: 48,
          fill: '#aaaaaa',
        },
      ],
      background: '#111111',
    }),
  },
  {
    id: 'yt-thumb-2',
    name: 'Thumb Colorida',
    category: 'YouTube Thumbnail',
    platform: 'youtube',
    format: 'thumbnail',
    width: 1280,
    height: 720,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg-left',
          left: 0, top: 0, width: 640, height: 720,
          fill: '#22c55e', selectable: false,
        },
        {
          type: 'rect',
          id: 'bg-right',
          left: 640, top: 0, width: 640, height: 720,
          fill: '#0f172a', selectable: false,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'APRENDA\nHOJE',
          left: 40, top: 160,
          fontFamily: 'Arial', fontSize: 130, fontWeight: 'bold',
          fill: '#0f172a', lineHeight: 1,
        },
        {
          type: 'i-text',
          id: 'topic',
          text: 'O ASSUNTO\nDO VÍDEO',
          left: 680, top: 180,
          fontFamily: 'Arial', fontSize: 100, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1.1,
        },
        {
          type: 'i-text',
          id: 'detail',
          text: 'em menos de 10 minutos',
          left: 680, top: 520,
          fontFamily: 'Arial', fontSize: 36,
          fill: '#94a3b8',
        },
      ],
      background: '#22c55e',
    }),
  },

  // ── Facebook Post ─────────────────────────────────────────────────────────
  {
    id: 'fb-post-1',
    name: 'Post Profissional',
    category: 'Facebook Post',
    platform: 'facebook',
    format: 'feed',
    width: 1200,
    height: 630,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1200, height: 630,
          fill: '#1e293b', selectable: false,
        },
        {
          type: 'rect',
          id: 'sidebar',
          left: 0, top: 0, width: 8, height: 630,
          fill: '#22c55e', selectable: false,
        },
        {
          type: 'i-text',
          id: 'label',
          text: 'DESTAQUE',
          left: 60, top: 60,
          fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold',
          fill: '#22c55e', charSpacing: 300,
        },
        {
          type: 'i-text',
          id: 'headline',
          text: 'Título Principal\nDo Post',
          left: 60, top: 130,
          fontFamily: 'Arial', fontSize: 90, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1.1,
        },
        {
          type: 'i-text',
          id: 'body',
          text: 'Descrição objetiva do conteúdo que está sendo\ncompartilhado com a sua audiência.',
          left: 60, top: 430,
          fontFamily: 'Arial', fontSize: 34,
          fill: '#94a3b8', lineHeight: 1.5,
        },
        {
          type: 'i-text',
          id: 'logo',
          text: 'SUA MARCA',
          left: 980, top: 560,
          fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold',
          fill: '#22c55e',
        },
      ],
      background: '#1e293b',
    }),
  },
  {
    id: 'fb-post-2',
    name: 'Post Anúncio',
    category: 'Facebook Post',
    platform: 'facebook',
    format: 'feed',
    width: 1200,
    height: 630,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1200, height: 630,
          fill: '#022c22', selectable: false,
        },
        {
          type: 'circle',
          id: 'glow',
          left: 800, top: 100, radius: 300,
          fill: 'rgba(34,197,94,0.07)', selectable: false,
        },
        {
          type: 'i-text',
          id: 'offer',
          text: 'OFERTA\nESPECIAL',
          left: 80, top: 80,
          fontFamily: 'Arial', fontSize: 110, fontWeight: 'bold',
          fill: '#22c55e', lineHeight: 1,
        },
        {
          type: 'i-text',
          id: 'desc',
          text: 'Aproveite enquanto durar!',
          left: 80, top: 390,
          fontFamily: 'Arial', fontSize: 44,
          fill: '#ffffff',
        },
        {
          type: 'rect',
          id: 'btn',
          left: 80, top: 470, width: 360, height: 80,
          fill: '#22c55e', rx: 8,
        },
        {
          type: 'i-text',
          id: 'btn-text',
          text: 'SAIBA MAIS',
          left: 148, top: 490,
          fontFamily: 'Arial', fontSize: 34, fontWeight: 'bold',
          fill: '#000000',
        },
      ],
      background: '#022c22',
    }),
  },

  // ── X Post ────────────────────────────────────────────────────────────────
  {
    id: 'x-post-1',
    name: 'X Citação',
    category: 'X Post',
    platform: 'x',
    format: 'post',
    width: 1200,
    height: 675,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1200, height: 675,
          fill: '#000000', selectable: false,
        },
        {
          type: 'i-text',
          id: 'quote-mark',
          text: '"',
          left: 60, top: 20,
          fontFamily: 'Georgia', fontSize: 300, fontWeight: 'bold',
          fill: '#1d4ed8', lineHeight: 1,
        },
        {
          type: 'i-text',
          id: 'quote',
          text: 'Sua citação ou frase de\nimpacto principal aqui.',
          left: 80, top: 220,
          fontFamily: 'Georgia', fontSize: 72,
          fill: '#ffffff', lineHeight: 1.3,
        },
        {
          type: 'i-text',
          id: 'author',
          text: '— @seuusuario',
          left: 80, top: 560,
          fontFamily: 'Arial', fontSize: 36,
          fill: '#94a3b8',
        },
      ],
      background: '#000000',
    }),
  },
  {
    id: 'x-post-2',
    name: 'X Estatística',
    category: 'X Post',
    platform: 'x',
    format: 'post',
    width: 1200,
    height: 675,
    fabricJSON: JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'rect',
          id: 'bg',
          left: 0, top: 0, width: 1200, height: 675,
          fill: '#0f172a', selectable: false,
        },
        {
          type: 'rect',
          id: 'card',
          left: 80, top: 80, width: 480, height: 520,
          fill: '#1e293b', rx: 16, selectable: false,
        },
        {
          type: 'i-text',
          id: 'number',
          text: '97%',
          left: 100, top: 150,
          fontFamily: 'Arial', fontSize: 160, fontWeight: 'bold',
          fill: '#22c55e',
        },
        {
          type: 'i-text',
          id: 'stat-label',
          text: 'dos usuários\nresolveram\nseu problema',
          left: 100, top: 380,
          fontFamily: 'Arial', fontSize: 40,
          fill: '#94a3b8', lineHeight: 1.3,
        },
        {
          type: 'i-text',
          id: 'insight',
          text: 'Fato ou insight\nprincipaldesta\npublicação',
          left: 620, top: 160,
          fontFamily: 'Arial', fontSize: 68, fontWeight: 'bold',
          fill: '#ffffff', lineHeight: 1.15,
        },
        {
          type: 'i-text',
          id: 'handle',
          text: '@seuusuario',
          left: 620, top: 560,
          fontFamily: 'Arial', fontSize: 32,
          fill: '#22c55e',
        },
      ],
      background: '#0f172a',
    }),
  },
]

interface Props {
  onSelect: (template: Template) => void
}

const CATEGORIES = ['Instagram Feed', 'Instagram Story', 'YouTube Thumbnail', 'Facebook Post', 'X Post']

export function TemplateGallery({ onSelect }: Props) {
  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Templates</p>
      {CATEGORIES.map((cat) => {
        const templates = TEMPLATES.filter((t) => t.category === cat)
        return (
          <div key={cat}>
            <p className="text-xs text-zinc-500 mb-2">{cat}</p>
            <div className="space-y-1.5">
              {templates.map((tpl) => {
                const ratio = tpl.width / tpl.height
                const previewW = ratio >= 1 ? 44 : Math.round(44 * ratio)
                const previewH = ratio >= 1 ? Math.round(44 / ratio) : 44
                return (
                  <button
                    key={tpl.id}
                    onClick={() => onSelect(tpl)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-zinc-800 hover:border-green-500/40 hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    <div
                      className="shrink-0 rounded bg-zinc-700 border border-zinc-600 overflow-hidden"
                      style={{ width: previewW, height: previewH }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{tpl.name}</p>
                      <p className="text-[10px] text-zinc-600">
                        {tpl.width}×{tpl.height}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
