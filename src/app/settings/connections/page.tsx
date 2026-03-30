'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Camera,
  Globe,
  Tv,
  Music,
  AtSign,
  Briefcase,
  MessageCircle,
  Cloud,
  Pin,
  Check,
  Loader2,
  ExternalLink,
  Key,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import {
  getIntegrations,
  getOAuthUrl,
  POSTIZ_API_KEY_STORAGE,
  PROVIDERS,
  type PostizIntegration,
} from '@/lib/postiz'

// Map provider identifier to Lucide icon component
const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram:  Camera,
  facebook:   Globe,
  youtube:    Tv,
  tiktok:     Music,
  x:          AtSign,
  linkedin:   Briefcase,
  threads:    MessageCircle,
  pinterest:  Pin,
  bluesky:    Cloud,
}

const PROVIDER_ORDER = [
  'instagram',
  'facebook',
  'youtube',
  'tiktok',
  'x',
  'linkedin',
  'threads',
  'pinterest',
  'bluesky',
]

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800" />
        <div className="h-4 bg-zinc-800 rounded w-24" />
      </div>
      <div className="h-7 bg-zinc-800 rounded w-28" />
    </div>
  )
}

// ── Provider card ─────────────────────────────────────────────────────────────

interface ProviderCardProps {
  provider: string
  connected?: PostizIntegration
  onConnect: (provider: string) => void
  connecting: boolean
}

function ProviderCard({ provider, connected, onConnect, connecting }: ProviderCardProps) {
  const info = PROVIDERS[provider]
  const Icon = PROVIDER_ICONS[provider] ?? Globe

  return (
    <div className={`rounded-xl border bg-zinc-900 p-4 space-y-3 transition-colors ${
      connected ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Icon className={`w-4 h-4 ${info?.color ?? 'text-zinc-400'}`} />
          </div>
          <span className="text-sm font-medium text-zinc-200">{info?.name ?? provider}</span>
        </div>
        {connected && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            Conectado
          </span>
        )}
      </div>

      {/* Connected account details */}
      {connected && (
        <div className="flex items-center gap-2.5">
          {connected.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={connected.picture}
              alt={connected.name}
              className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-medium">
              {connected.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate">{connected.name}</p>
            {connected.profile && (
              <p className="text-[10px] text-zinc-500 truncate">{connected.profile}</p>
            )}
          </div>
        </div>
      )}

      {/* Action */}
      {connected ? (
        <p className="text-[11px] text-zinc-600">
          Para desconectar, acesse o{' '}
          <a
            href="https://social.elabdata.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
          >
            painel do Postiz
          </a>
          .
        </p>
      ) : (
        <button
          onClick={() => onConnect(provider)}
          disabled={connecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
        >
          {connecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ExternalLink className="w-3 h-3" />
          )}
          Conectar
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  // Load stored key on mount
  useEffect(() => {
    const stored = localStorage.getItem(POSTIZ_API_KEY_STORAGE)
    if (stored) {
      setSavedKey(stored)
      setApiKey(stored)
    }
  }, [])

  const fetchIntegrations = useCallback(async (key: string) => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getIntegrations(key)
      setIntegrations(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erro ao carregar integrações')
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch integrations when savedKey changes
  useEffect(() => {
    if (savedKey) {
      fetchIntegrations(savedKey)
    }
  }, [savedKey, fetchIntegrations])

  const handleSaveKey = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    setSavingKey(true)
    localStorage.setItem(POSTIZ_API_KEY_STORAGE, trimmed)
    setSavedKey(trimmed)
    setKeySaved(true)
    setSavingKey(false)
    setTimeout(() => setKeySaved(false), 3000)
  }

  const handleConnect = async (provider: string) => {
    if (!savedKey) return
    setConnectingProvider(provider)
    try {
      const { url } = await getOAuthUrl(savedKey, provider)
      const popup = window.open(url, '_blank', 'width=600,height=700')

      // Poll for popup closure, then refresh integrations
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          setConnectingProvider(null)
          fetchIntegrations(savedKey)
        }
      }, 500)

      // Safety timeout: stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(timer)
        setConnectingProvider(null)
      }, 5 * 60 * 1000)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erro ao iniciar autenticação')
      setConnectingProvider(null)
    }
  }

  // Build a map from providerIdentifier -> integration (first match)
  const connectedMap = integrations.reduce<Record<string, PostizIntegration>>((acc, integration) => {
    if (!acc[integration.providerIdentifier]) {
      acc[integration.providerIdentifier] = integration
    }
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Conexoes de Redes Sociais</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Conecte suas contas para agendar e publicar posts.
            </p>
          </div>
        </div>

        {/* API Key section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">API Key do Postiz</h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <p className="text-sm text-zinc-400">
              Cole sua chave de API do Postiz abaixo. Para gerar uma chave, acesse{' '}
              <a
                href="https://social.elabdata.com.br/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
              >
                Configuracoes no Postiz
                <ExternalLink className="w-3 h-3" />
              </a>
              .
            </p>

            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Cole sua API Key aqui..."
                className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition-colors font-mono"
              />
              <button
                onClick={handleSaveKey}
                disabled={savingKey || !apiKey.trim()}
                className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
              >
                {savingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : keySaved ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {keySaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>

            {savedKey && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Chave configurada.{' '}
                  <span className="text-zinc-600 font-mono">
                    {savedKey.slice(0, 8)}••••••••
                  </span>
                </p>
                <button
                  onClick={() => fetchIntegrations(savedKey)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Error banner */}
        {fetchError && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Erro ao conectar com o Postiz</p>
              <p className="text-xs text-red-500/80 mt-0.5">{fetchError}</p>
            </div>
          </div>
        )}

        {/* No API key CTA */}
        {!savedKey && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-2">
            <p className="text-zinc-400 text-sm">Configure sua API Key para ver e conectar suas contas.</p>
          </div>
        )}

        {/* Integrations grid */}
        {savedKey && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">Plataformas</h2>
              {integrations.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {integrations.length} conta{integrations.length !== 1 ? 's' : ''} conectada{integrations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PROVIDER_ORDER.map((provider) => (
                  <ProviderCard
                    key={provider}
                    provider={provider}
                    connected={connectedMap[provider]}
                    onConnect={handleConnect}
                    connecting={connectingProvider === provider}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* All connected accounts list (when more than one per provider) */}
        {integrations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-100">Todas as contas conectadas</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              {integrations.map((integration) => {
                const info = PROVIDERS[integration.providerIdentifier]
                const Icon = PROVIDER_ICONS[integration.providerIdentifier] ?? Globe
                return (
                  <div key={integration.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={`w-4 h-4 shrink-0 ${info?.color ?? 'text-zinc-400'}`} />
                    {integration.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={integration.picture}
                        alt={integration.name}
                        className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                        {integration.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{integration.name}</p>
                      {integration.profile && (
                        <p className="text-xs text-zinc-500 truncate">{integration.profile}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{info?.name ?? integration.providerIdentifier}</span>
                    {integration.disabled && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                        Desativado
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
