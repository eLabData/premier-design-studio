'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Type,
  ImageIcon,
  Square,
  Circle,
  Palette,
  Download,
  LayoutTemplate,
  Minus,
  Trash2,
  Save,
} from 'lucide-react'
import { FormatSelector } from '@/components/designer/FormatSelector'
import { ElementProperties } from '@/components/designer/ElementProperties'
import { TemplateGallery, type Template } from '@/components/designer/TemplateGallery'
import type { Platform } from '@/types/project'
import type { useCanvasEditor, ElementProps } from '@/hooks/useCanvasEditor'
import { saveProject } from '@/lib/storage'

// Canvas must be loaded client-only (Fabric.js uses browser APIs)
const CanvasWorkspace = dynamic(
  () => import('@/components/designer/CanvasWorkspace').then((m) => m.CanvasWorkspace),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Carregando canvas…</div> },
)

type ToolPanel = 'text' | 'image' | 'shape' | 'background' | 'templates' | 'format' | 'export' | null

const TOOLS = [
  { id: 'text' as ToolPanel, icon: Type, label: 'Texto' },
  { id: 'image' as ToolPanel, icon: ImageIcon, label: 'Imagem' },
  { id: 'shape' as ToolPanel, icon: Square, label: 'Forma' },
  { id: 'background' as ToolPanel, icon: Palette, label: 'Fundo' },
  { id: 'templates' as ToolPanel, icon: LayoutTemplate, label: 'Templates' },
  { id: 'export' as ToolPanel, icon: Download, label: 'Exportar' },
]

export default function DesignerPage() {
  const [activePanel, setActivePanel] = useState<ToolPanel>(null)
  const [canvasWidth, setCanvasWidth] = useState(1080)
  const [canvasHeight, setCanvasHeight] = useState(1080)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram')
  const [selectedFormat, setSelectedFormat] = useState('feed')
  const [selectedElement, setSelectedElement] = useState<ElementProps | null>(null)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [imageUrl, setImageUrl] = useState('')
  const [projectName, setProjectName] = useState('Projeto sem título')
  const editorRef = useRef<ReturnType<typeof useCanvasEditor> | null>(null)

  const handleEditorReady = useCallback((ed: ReturnType<typeof useCanvasEditor>) => {
    editorRef.current = ed
  }, [])

  const handleSelectionChange = useCallback((props: ElementProps | null) => {
    setSelectedElement(props)
  }, [])

  const handleFormatSelect = (platform: Platform, format: string, w: number, h: number) => {
    setSelectedPlatform(platform)
    setSelectedFormat(format)
    setCanvasWidth(w)
    setCanvasHeight(h)
  }

  const handleTemplateSelect = async (tpl: Template) => {
    setSelectedPlatform(tpl.platform)
    setSelectedFormat(tpl.format)
    setCanvasWidth(tpl.width)
    setCanvasHeight(tpl.height)
    // slight delay to allow canvas re-init on size change
    setTimeout(() => {
      editorRef.current?.loadTemplate(tpl.fabricJSON)
    }, 100)
    setActivePanel(null)
  }

  const handleAddText = () => {
    editorRef.current?.addText('Clique para editar', { fill: '#000000', fontSize: 64 })
  }

  const handleAddShape = (type: 'rect' | 'circle' | 'line') => {
    editorRef.current?.addShape(type)
  }

  const handleAddImage = () => {
    if (!imageUrl.trim()) return
    editorRef.current?.addImage(imageUrl.trim())
    setImageUrl('')
  }

  const handleSetBackground = () => {
    editorRef.current?.setBackground(bgColor)
  }

  const handleUpdateElement = (props: Partial<ElementProps>) => {
    if (!selectedElement) return
    editorRef.current?.updateElement(selectedElement.id, props)
    setSelectedElement((prev) => (prev ? { ...prev, ...props } : null))
  }

  const handleExportPNG = async () => {
    const blob = await editorRef.current?.exportAsPNG()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJPG = async () => {
    const blob = await editorRef.current?.exportAsJPG(0.92)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}.jpg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = () => {
    const json = editorRef.current?.toJSON() ?? '{}'
    const now = new Date().toISOString()
    saveProject({
      id: crypto.randomUUID(),
      name: projectName,
      type: 'post',
      status: 'draft',
      created_at: now,
      updated_at: now,
      user_id: 'local',
      platform: selectedPlatform,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
      pages: [{ id: crypto.randomUUID(), elements: [], background: json }],
    })
    alert('Projeto salvo!')
  }

  const togglePanel = (id: ToolPanel) => setActivePanel((p) => (p === id ? null : id))

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-green-500 focus:outline-none px-1 py-0.5 w-56 transition-colors"
        />
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Salvar
        </button>
        <span className="text-xs text-zinc-600">
          {canvasWidth}×{canvasHeight}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tool sidebar */}
        <div className="w-16 shrink-0 border-r border-zinc-800 flex flex-col items-center gap-1 py-3">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => togglePanel(tool.id)}
              className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
                activePanel === tool.id
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-5 h-5" />
              <span className="text-[9px] leading-none">{tool.label}</span>
            </button>
          ))}
          <div className="flex-1" />
          {selectedElement && (
            <button
              onClick={() => editorRef.current?.removeSelected()}
              className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Remover"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[9px] leading-none">Remover</span>
            </button>
          )}
        </div>

        {/* Left secondary panel */}
        {activePanel && activePanel !== 'export' && (
          <div className="w-64 shrink-0 border-r border-zinc-800 p-4 overflow-y-auto">
            {activePanel === 'text' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Texto</p>
                <button
                  onClick={handleAddText}
                  className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  + Adicionar Texto
                </button>
                <p className="text-xs text-zinc-500">Dê duplo clique no texto para editar.</p>
              </div>
            )}

            {activePanel === 'image' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Imagem</p>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">URL da imagem</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full px-2.5 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60"
                  />
                  <button
                    onClick={handleAddImage}
                    disabled={!imageUrl.trim()}
                    className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Adicionar Imagem
                  </button>
                </div>
              </div>
            )}

            {activePanel === 'shape' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Formas</p>
                <div className="space-y-2">
                  {[
                    { type: 'rect' as const, icon: Square, label: 'Retângulo' },
                    { type: 'circle' as const, icon: Circle, label: 'Círculo' },
                    { type: 'line' as const, icon: Minus, label: 'Linha' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => handleAddShape(type)}
                      className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-zinc-800 hover:border-green-500/40 hover:bg-zinc-800/50 text-sm transition-colors"
                    >
                      <Icon className="w-4 h-4 text-zinc-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'background' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fundo</p>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Cor sólida</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-zinc-700 bg-transparent"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-green-500/60"
                    />
                  </div>
                  <button
                    onClick={handleSetBackground}
                    className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm transition-colors"
                  >
                    Aplicar Fundo
                  </button>
                  <div className="pt-2">
                    <label className="text-xs text-zinc-500">Cores rápidas</label>
                    <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                      {['#000000', '#ffffff', '#0f172a', '#1e293b', '#022c22', '#111827', '#7c3aed', '#dc2626', '#d97706', '#22c55e'].map((c) => (
                        <button
                          key={c}
                          onClick={() => { setBgColor(c); editorRef.current?.setBackground(c) }}
                          className="w-8 h-8 rounded-md border border-zinc-700 hover:scale-110 transition-transform"
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'templates' && (
              <TemplateGallery onSelect={handleTemplateSelect} />
            )}

            {activePanel === 'format' && (
              <FormatSelector
                selectedPlatform={selectedPlatform}
                selectedFormat={selectedFormat}
                onSelect={handleFormatSelect}
              />
            )}
          </div>
        )}

        {/* Export panel */}
        {activePanel === 'export' && (
          <div className="w-64 shrink-0 border-r border-zinc-800 p-4 space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Exportar</p>
            <button
              onClick={handleExportPNG}
              className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Baixar PNG
            </button>
            <button
              onClick={handleExportJPG}
              className="w-full py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium transition-colors"
            >
              Baixar JPG
            </button>
            <p className="text-xs text-zinc-600">
              O arquivo será exportado na resolução original: {canvasWidth}×{canvasHeight}px
            </p>
          </div>
        )}

        {/* Canvas */}
        <CanvasWorkspace
          width={canvasWidth}
          height={canvasHeight}
          onEditorReady={handleEditorReady}
          onSelectionChange={handleSelectionChange}
        />

        {/* Right sidebar: Format selector + Properties */}
        <div className="w-64 shrink-0 border-l border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800">
            <FormatSelector
              selectedPlatform={selectedPlatform}
              selectedFormat={selectedFormat}
              onSelect={handleFormatSelect}
            />
          </div>
          {selectedElement && (
            <div className="p-4">
              <ElementProperties
                element={selectedElement}
                onUpdate={handleUpdateElement}
                onBringForward={() => editorRef.current?.bringForward()}
                onSendBackward={() => editorRef.current?.sendBackward()}
                onRemove={() => { editorRef.current?.removeSelected(); setSelectedElement(null) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
