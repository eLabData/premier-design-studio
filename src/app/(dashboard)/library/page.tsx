'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, Trash2, ExternalLink, ImageIcon, LayoutGrid } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getProjects, deleteProject } from '@/lib/storage'
import type { PostProject } from '@/types/project'

type FilterTab = 'Todos' | 'Posts' | 'Carrosséis' | 'Publicados'
const TABS: FilterTab[] = ['Todos', 'Posts', 'Carrosséis', 'Publicados']

const STATUS_BADGES: Record<PostProject['status'], { label: string; class: string }> = {
  draft: { label: 'Rascunho', class: 'bg-zinc-700 text-zinc-300' },
  rendering: { label: 'Processando', class: 'bg-yellow-500/20 text-yellow-400' },
  ready: { label: 'Pronto', class: 'bg-blue-500/20 text-blue-400' },
  published: { label: 'Publicado', class: 'bg-green-500/20 text-green-400' },
}

const TYPE_BADGES: Record<PostProject['type'], { label: string; class: string }> = {
  post: { label: 'Post', class: 'bg-purple-500/20 text-purple-400' },
  carousel: { label: 'Carrossel', class: 'bg-indigo-500/20 text-indigo-400' },
}

export default function LibraryPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<PostProject[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('Todos')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setProjects(getProjects())
  }, [])

  const filtered = useMemo(() => {
    let list = projects
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (activeTab === 'Posts') list = list.filter((p) => p.type === 'post')
    else if (activeTab === 'Carrosséis') list = list.filter((p) => p.type === 'carousel')
    else if (activeTab === 'Publicados') list = list.filter((p) => p.status === 'published')
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [projects, search, activeTab])

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteProject(id)
      setProjects(getProjects())
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
    }
  }

  const handleOpen = (project: PostProject) => {
    router.push(`/designer?project=${project.id}`)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Biblioteca</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projetos…"
              className="pl-9 pr-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-green-500/50 w-56 transition-colors"
            />
          </div>
          <Link
            href="/designer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Post
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === tab
                ? 'bg-zinc-700 text-white'
                : 'border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">{filtered.length} projeto{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
            <div className="flex items-center gap-4">
              <LayoutGrid className="w-12 h-12 text-zinc-700" />
              <ImageIcon className="w-12 h-12 text-zinc-700" />
            </div>
            <p className="text-zinc-500">
              {search ? `Nenhum projeto encontrado para "${search}".` : 'Nenhum projeto ainda.'}
            </p>
            <p className="text-sm text-zinc-600">Crie um post no Designer para começar.</p>
            <Link
              href="/designer"
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar no Designer
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((project) => {
              const typeBadge = TYPE_BADGES[project.type]
              const statusBadge = STATUS_BADGES[project.status]
              const isDeleteConfirm = deleteConfirm === project.id

              return (
                <div
                  key={project.id}
                  className="group relative rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors"
                >
                  {/* Thumbnail */}
                  <div
                    className="w-full bg-zinc-800 flex items-center justify-center cursor-pointer"
                    style={{ aspectRatio: `${project.canvas_width} / ${project.canvas_height}` }}
                    onClick={() => handleOpen(project)}
                  >
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <p
                      className="text-sm font-medium truncate cursor-pointer hover:text-green-400 transition-colors"
                      onClick={() => handleOpen(project)}
                      title={project.name}
                    >
                      {project.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadge.class}`}>
                        {typeBadge.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      {format(new Date(project.updated_at), "d MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpen(project)}
                      className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      title="Abrir no designer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isDeleteConfirm
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-zinc-900/90 border-zinc-700 text-zinc-400 hover:text-red-400'
                      }`}
                      title={isDeleteConfirm ? 'Confirmar exclusão' : 'Excluir'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Delete confirmation tooltip */}
                  {isDeleteConfirm && (
                    <div className="absolute inset-x-0 bottom-0 bg-red-500/10 border-t border-red-500/30 px-3 py-2 text-center">
                      <p className="text-[10px] text-red-400 mb-1.5">Confirmar exclusão?</p>
                      <div className="flex gap-1.5 justify-center">
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="px-2.5 py-1 rounded bg-red-600 text-[10px] text-white hover:bg-red-700 transition-colors"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2.5 py-1 rounded bg-zinc-700 text-[10px] text-zinc-300 hover:bg-zinc-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
