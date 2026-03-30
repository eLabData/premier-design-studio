'use client'

import { useState } from 'react'
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
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { PROVIDERS } from '@/lib/postiz'
import { useSocial } from '@/hooks/useSocial'

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

interface ProviderCardProps {
  provider: string
  connectedName?: string
  connectedPicture?: string
  connectedHandle?: string
  connectedId?: string
  onConnect: (provider: string) => void
  onDisconnect: (integrationId: string) => void
  connecting: boolean
}

function ProviderCard({
  provider,
  connectedName,
  connectedPicture,
  connectedHandle,
  connectedId,
  onConnect,
  onDisconnect,
  connecting,
}: ProviderCardProps) {
  const info = PROVIDERS[provider]
  const Icon = PROVIDER_ICONS[provider] ?? Globe
  const isConnected = !!connectedId

  return (
    <div className={`rounded-xl border bg-zinc-900 p-4 space-y-3 transition-colors ${
      isConnected ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Icon className={`w-4 h-4 ${info?.color ?? 'text-zinc-400'}`} />
          </div>
          <span className="text-sm font-medium text-zinc-200">{info?.name ?? provider}</span>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" />
            Conectado
          </span>
        )}
      </div>

      {isConnected && (
        <div className="flex items-center gap-2.5">
          {connectedPicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={connectedPicture}
              alt={connectedName}
              className="w-7 h-7 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 font-medium">
              {(connectedName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-300 truncate">{connectedName}</p>
            {connectedHandle && (
              <p className="text-[10px] text-zinc-500 truncate">@{connectedHandle}</p>
            )}
          </div>
        </div>
      )}

      {isConnected ? (
        <button
          onClick={() => onDisconnect(connectedId!)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 text-xs transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Desconectar
        </button>
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

export default function ConnectionsPage() {
  const { integrations, loading, error, connect, disconnect, refresh } = useSocial()
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  const handleConnect = async (provider: string) => {
    setConnectingProvider(provider)
    try {
      await connect(provider)
    } catch {
      // error shown via useSocial
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    await disconnect(integrationId)
  }

  // Map provider -> first connected integration
  const connectedMap = integrations.reduce<Record<string, typeof integrations[number]>>((acc, integration) => {
    if (!acc[integration.provider]) {
      acc[integration.provider] = integration
    }
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

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

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-950/30 border border-red-500/30 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Erro ao carregar contas</p>
              <p className="text-xs text-red-500/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">Plataformas</h2>
            <div className="flex items-center gap-3">
              {integrations.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {integrations.length} conta{integrations.length !== 1 ? 's' : ''} conectada{integrations.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PROVIDER_ORDER.map((provider) => {
                const connected = connectedMap[provider]
                return (
                  <ProviderCard
                    key={provider}
                    provider={provider}
                    connectedId={connected?.id}
                    connectedName={connected?.account_name}
                    connectedPicture={connected?.account_picture}
                    connectedHandle={connected?.account_handle}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    connecting={connectingProvider === provider}
                  />
                )
              })}
            </div>
          )}
        </section>

        {integrations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-100">Todas as contas conectadas</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              {integrations.map((integration) => {
                const info = PROVIDERS[integration.provider]
                const Icon = PROVIDER_ICONS[integration.provider] ?? Globe
                return (
                  <div key={integration.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={`w-4 h-4 shrink-0 ${info?.color ?? 'text-zinc-400'}`} />
                    {integration.account_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={integration.account_picture}
                        alt={integration.account_name}
                        className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                        {integration.account_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{integration.account_name}</p>
                      {integration.account_handle && (
                        <p className="text-xs text-zinc-500 truncate">@{integration.account_handle}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{info?.name ?? integration.provider}</span>
                    {integration.refresh_needed && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full">
                        Reconectar
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
