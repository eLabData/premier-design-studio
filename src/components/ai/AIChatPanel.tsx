'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Trash2, ImagePlus, MessageCircle, ChevronRight, Loader2 } from 'lucide-react'

export interface AIAction {
  type: string
  params: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  imageUrl?: string
}

export interface AIChatPanelProps {
  context: 'video' | 'designer' | 'photo'
  onAction?: (action: AIAction) => void
  className?: string
  /** When true the panel renders as always-visible (used inside tab layouts) */
  inline?: boolean
}

const CONTEXT_LABELS: Record<string, string> = {
  video: 'Chat IA — Video',
  designer: 'Chat IA — Designer',
  photo: 'Chat IA — Fotos',
}

const PLACEHOLDER_MESSAGES: Record<string, string> = {
  video: 'Pergunte sobre cortes, legendas, efeitos…',
  designer: 'Pergunte sobre cores, layout, tipografia…',
  photo: 'Pergunte sobre filtros, ajustes de cor…',
}

export function AIChatPanel({ context, onAction, className = '', inline = false }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages or streaming content change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPendingImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPendingImage(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (isLoading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      imageUrl: pendingImage ?? undefined,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setPendingImage(null)
    setIsLoading(true)
    setStreamingContent('')

    // Build history for the API — only last 12 messages to keep token count reasonable
    const history = [...messages, userMsg].slice(-12).map((m) => ({
      role: m.role,
      content: m.imageUrl
        ? [
            { type: 'image_url', image_url: { url: m.imageUrl } },
            { type: 'text', text: m.content || '(imagem enviada)' },
          ]
        : m.content,
    }))

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)

      const data = (await res.json()) as { content: string }
      const content = data.content ?? 'Sem resposta.'

      // Try to parse action hints from the AI response
      // The AI may embed JSON blocks like: ```action\n{"type":"change_color","params":{...}}\n```
      const actionMatch = content.match(/```action\n([\s\S]*?)\n```/)
      if (actionMatch && onAction) {
        try {
          const action = JSON.parse(actionMatch[1]) as AIAction
          onAction(action)
        } catch {
          // malformed action block — ignore
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Erro ao conectar com a IA. Tente novamente. (${err instanceof Error ? err.message : 'desconhecido'})`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setStreamingContent('')
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setMessages([])
    setStreamingContent('')
    setPendingImage(null)
  }

  // Collapsed state — shows only a slim bar
  if (collapsed && !inline) {
    return (
      <div
        className={`flex flex-col items-center w-10 bg-zinc-900 border-l border-zinc-800 py-3 gap-3 cursor-pointer ${className}`}
        onClick={() => setCollapsed(false)}
        title="Abrir Chat IA"
      >
        <MessageCircle className="w-5 h-5 text-green-400" />
        <ChevronRight className="w-4 h-4 text-zinc-500" />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col bg-zinc-900 border-l border-zinc-800 ${inline ? 'h-full' : 'w-80'} ${className}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 shrink-0">
        <MessageCircle className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-xs font-semibold text-zinc-300 flex-1 truncate">
          {CONTEXT_LABELS[context]}
        </span>
        <button
          onClick={handleClear}
          className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded"
          title="Limpar conversa"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {!inline && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded"
            title="Recolher painel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
            <MessageCircle className="w-8 h-8 text-zinc-700" />
            <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">
              Converse com a IA para obter sugestoes e dicas de edicao.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.imageUrl && (
              <div className={`${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={msg.imageUrl}
                  alt="Imagem enviada"
                  className="w-32 h-32 object-cover rounded-lg border border-zinc-700"
                />
              </div>
            )}
            {msg.content && (
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-green-600/20 text-zinc-100 border border-green-600/30'
                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                }`}
              >
                {msg.content}
              </div>
            )}
            <span className="text-[10px] text-zinc-600 px-1">
              {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin" />
              <span className="text-xs text-zinc-400">Pensando…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-3 pb-2 shrink-0">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="Pre-visualizacao"
              className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-zinc-800 p-2 flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
            title="Enviar imagem"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER_MESSAGES[context]}
            rows={1}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 resize-none leading-relaxed max-h-24 overflow-y-auto"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !pendingImage)}
            className="p-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Enviar (Enter)"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-700 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
