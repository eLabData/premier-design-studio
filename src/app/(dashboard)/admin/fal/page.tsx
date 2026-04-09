'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Key,
  DollarSign,
  BarChart3,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Activity,
  TrendingUp,
  Cpu,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface BillingData {
  username: string
  credits?: { current_balance: number; currency: string }
}

interface UsageSummaryItem {
  endpoint_id: string
  unit: string
  quantity: number
  unit_price: number
  cost: number
  currency: string
}

interface TimeSeriesBucket {
  bucket: string
  results: UsageSummaryItem[]
}

interface UsageData {
  time_series?: TimeSeriesBucket[]
  summary?: UsageSummaryItem[]
  has_more?: boolean
}

interface ApiKey {
  key_id: string
  alias: string
  scope: string
  created_at: string
  key_secret?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(val: number) {
  return `$${val.toFixed(4)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function modelName(endpointId: string) {
  return endpointId
    .replace('fal-ai/', '')
    .replace(/\//g, ' › ')
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FalAdminPage() {
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState({ billing: false, usage: false, keys: false })
  const [error, setError] = useState<string | null>(null)
  const [newKeyAlias, setNewKeyAlias] = useState('')
  const [newKeyScope, setNewKeyScope] = useState<'API' | 'ADMIN'>('API')
  const [creatingKey, setCreatingKey] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'keys'>('overview')

  const fetchBilling = useCallback(async () => {
    setLoading((l) => ({ ...l, billing: true }))
    try {
      const res = await fetch('/api/admin/fal?action=billing')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBilling(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar billing')
    } finally {
      setLoading((l) => ({ ...l, billing: false }))
    }
  }, [])

  const fetchUsage = useCallback(async () => {
    setLoading((l) => ({ ...l, usage: true }))
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
      const start = new Date(Date.now() - days * 86400000).toISOString()
      const res = await fetch(`/api/admin/fal?action=usage&start=${encodeURIComponent(start)}&timeframe=day`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usage')
    } finally {
      setLoading((l) => ({ ...l, usage: false }))
    }
  }, [dateRange])

  const fetchKeys = useCallback(async () => {
    setLoading((l) => ({ ...l, keys: true }))
    try {
      const res = await fetch('/api/admin/fal?action=keys')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setKeys(Array.isArray(data) ? data : data.keys || data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar keys')
    } finally {
      setLoading((l) => ({ ...l, keys: false }))
    }
  }, [])

  useEffect(() => {
    fetchBilling()
    fetchUsage()
    fetchKeys()
  }, [fetchBilling, fetchUsage, fetchKeys])

  useEffect(() => {
    fetchUsage()
  }, [dateRange, fetchUsage])

  const handleCreateKey = async () => {
    if (!newKeyAlias.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/admin/fal?action=create-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: newKeyAlias.trim(), scope: newKeyScope }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewKeyAlias('')
      fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar key')
    } finally {
      setCreatingKey(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Tem certeza? Essa acao e irreversivel.')) return
    try {
      const res = await fetch('/api/admin/fal?action=delete-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar key')
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Aggregate usage by model
  const usageByModel = (usage?.summary || []).reduce<Record<string, { quantity: number; cost: number }>>((acc, item) => {
    const name = modelName(item.endpoint_id)
    if (!acc[name]) acc[name] = { quantity: 0, cost: 0 }
    acc[name].quantity += item.quantity
    acc[name].cost += item.cost
    return acc
  }, {})

  const totalCost = Object.values(usageByModel).reduce((sum, v) => sum + v.cost, 0)
  const totalRequests = Object.values(usageByModel).reduce((sum, v) => sum + v.quantity, 0)

  // Daily cost chart data
  const dailyCosts = (usage?.time_series || []).map((bucket) => ({
    date: new Date(bucket.bucket).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    cost: bucket.results.reduce((sum, r) => sum + r.cost, 0),
    requests: bucket.results.reduce((sum, r) => sum + r.quantity, 0),
  }))

  const maxDailyCost = Math.max(...dailyCosts.map((d) => d.cost), 0.01)

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-semibold">fal.ai Admin</h1>
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-semibold uppercase">
          Super Admin
        </span>
        <div className="flex-1" />
        <button
          onClick={() => { fetchBilling(); fetchUsage(); fetchKeys() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${Object.values(loading).some(Boolean) ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3">
        {(['overview', 'usage', 'keys'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'overview' && <BarChart3 className="w-3.5 h-3.5" />}
            {tab === 'usage' && <Activity className="w-3.5 h-3.5" />}
            {tab === 'keys' && <Key className="w-3.5 h-3.5" />}
            {tab === 'overview' ? 'Visao Geral' : tab === 'usage' ? 'Uso Detalhado' : 'API Keys'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Top cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Balance */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Saldo</span>
                </div>
                {loading.billing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-green-400">
                      ${billing?.credits?.current_balance?.toFixed(2) ?? '—'}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">{billing?.username ?? ''}</p>
                  </>
                )}
              </div>

              {/* Total cost period */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-zinc-400 uppercase font-semibold">Gasto ({dateRange})</span>
                </div>
                {loading.usage ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-orange-400">{formatUsd(totalCost)}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{totalRequests} requests</p>
                  </>
                )}
              </div>

              {/* Active keys */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400 uppercase font-semibold">API Keys</span>
                </div>
                {loading.keys ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-purple-400">{keys.length}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">keys ativas</p>
                  </>
                )}
              </div>
            </div>

            {/* Date range selector */}
            <div className="flex items-center gap-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : '90 dias'}
                </button>
              ))}
            </div>

            {/* Daily cost chart */}
            {dailyCosts.length > 0 && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase mb-3">Custo Diario</h3>
                <div className="flex items-end gap-[2px] h-32">
                  {dailyCosts.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full rounded-t bg-purple-500/60 hover:bg-purple-400/80 transition-colors cursor-default min-h-[2px]"
                        style={{ height: `${Math.max((day.cost / maxDailyCost) * 100, 2)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap shadow-xl">
                          <p className="font-semibold text-white">{day.date}</p>
                          <p className="text-zinc-400">{formatUsd(day.cost)} · {day.requests} req</p>
                        </div>
                      </div>
                      {i % Math.ceil(dailyCosts.length / 8) === 0 && (
                        <span className="text-[8px] text-zinc-600 mt-0.5 rotate-0">{day.date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usage by model */}
            {Object.keys(usageByModel).length > 0 && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase mb-3">Uso por Modelo</h3>
                <div className="space-y-2">
                  {Object.entries(usageByModel)
                    .sort(([, a], [, b]) => b.cost - a.cost)
                    .map(([name, data]) => (
                      <div key={name} className="flex items-center gap-3">
                        <Cpu className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <span className="text-xs text-zinc-300 flex-1 truncate">{name}</span>
                        <span className="text-[10px] text-zinc-500 tabular-nums">{data.quantity} req</span>
                        <span className="text-xs font-mono text-zinc-300 tabular-nums w-20 text-right">
                          {formatUsd(data.cost)}
                        </span>
                        <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${totalCost > 0 ? (data.cost / totalCost) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── USAGE TAB ── */}
        {activeTab === 'usage' && (
          <>
            <div className="flex items-center gap-1 mb-3">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    dateRange === range ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : '90 dias'}
                </button>
              ))}
            </div>

            {loading.usage ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800">
                      <th className="text-left px-3 py-2 text-zinc-500 font-semibold">Data</th>
                      <th className="text-left px-3 py-2 text-zinc-500 font-semibold">Modelo</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">Requests</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">Preco/un</th>
                      <th className="text-right px-3 py-2 text-zinc-500 font-semibold">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(usage?.time_series || []).flatMap((bucket) =>
                      bucket.results.map((r, i) => (
                        <tr key={`${bucket.bucket}-${i}`} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                          <td className="px-3 py-2 text-zinc-400">{formatDate(bucket.bucket)}</td>
                          <td className="px-3 py-2 text-zinc-300 font-mono text-[10px]">{modelName(r.endpoint_id)}</td>
                          <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{r.quantity}</td>
                          <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">{formatUsd(r.unit_price)}</td>
                          <td className="px-3 py-2 text-right text-zinc-200 font-semibold tabular-nums">{formatUsd(r.cost)}</td>
                        </tr>
                      ))
                    )}
                    {(usage?.time_series || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-zinc-600">
                          Nenhum uso no periodo selecionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {totalCost > 0 && (
                    <tfoot>
                      <tr className="bg-zinc-900 border-t border-zinc-700">
                        <td colSpan={2} className="px-3 py-2 text-zinc-400 font-semibold">Total</td>
                        <td className="px-3 py-2 text-right text-zinc-300 font-semibold tabular-nums">{totalRequests}</td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 text-right text-white font-bold tabular-nums">{formatUsd(totalCost)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </>
        )}

        {/* ── KEYS TAB ── */}
        {activeTab === 'keys' && (
          <>
            {/* Create key form */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase mb-3">Criar Nova Key</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyAlias}
                  onChange={(e) => setNewKeyAlias(e.target.value)}
                  placeholder="Nome da key (ex: mobile-app, user-tier-pro)"
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
                <select
                  value={newKeyScope}
                  onChange={(e) => setNewKeyScope(e.target.value as 'API' | 'ADMIN')}
                  className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none"
                >
                  <option value="API">API (consumo)</option>
                  <option value="ADMIN">ADMIN (gestao)</option>
                </select>
                <button
                  onClick={handleCreateKey}
                  disabled={!newKeyAlias.trim() || creatingKey}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-sm font-medium text-white transition-colors"
                >
                  {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar
                </button>
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">
                API = consumo de modelos · ADMIN = gestao de conta, billing, keys
              </p>
            </div>

            {/* Keys list */}
            {loading.keys ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
              </div>
            ) : keys.length > 0 ? (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.key_id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3"
                  >
                    <Key className="w-4 h-4 text-zinc-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{key.alias || 'Sem nome'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          key.scope === 'ADMIN'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {key.scope}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        ID: {key.key_id} · Criada: {key.created_at ? formatDate(key.created_at) : '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(key.key_id, key.key_id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                      title="Copiar ID"
                    >
                      {copiedId === key.key_id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.key_id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Deletar key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-600 text-sm">
                Nenhuma key encontrada
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
