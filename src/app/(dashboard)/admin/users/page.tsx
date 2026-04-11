'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  DollarSign,
  Briefcase,
  Film,
  Loader2,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface UserWithStats {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  ai_jobs_count: number
  ai_jobs_cost: number
  shorts_count: number
  shorts_cost: number
  total_cost: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtUSD(v: number) {
  return `$${v.toFixed(2)}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<keyof UserWithStats>('total_cost')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        return data.users ?? data
      })
      .then((u: UserWithStats[]) => {
        u.sort((a, b) => b.total_cost - a.total_cost)
        setUsers(u)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...users].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number')
      return sortAsc ? av - bv : bv - av
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })

  function toggleSort(key: keyof UserWithStats) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  // Summaries
  const totalUsers = users.length
  const totalCost = users.reduce((s, u) => s + u.total_cost, 0)
  const totalJobs = users.reduce((s, u) => s + u.ai_jobs_count, 0)
  const totalShorts = users.reduce((s, u) => s + u.shorts_count, 0)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Admin
        </Link>
        <h1 className="text-2xl font-bold">Usuarios &amp; Uso</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={<Users className="w-5 h-5 text-purple-400" />} label="Total Usuarios" value={String(totalUsers)} />
        <SummaryCard icon={<DollarSign className="w-5 h-5 text-green-400" />} label="Custo Total" value={fmtUSD(totalCost)} />
        <SummaryCard icon={<Briefcase className="w-5 h-5 text-blue-400" />} label="Total AI Jobs" value={String(totalJobs)} />
        <SummaryCard icon={<Film className="w-5 h-5 text-pink-400" />} label="Total Shorts" value={String(totalShorts)} />
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 text-left">
                <SortTh label="Email" sortKey="email" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortTh label="Criado em" sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortTh label="Ultimo login" sortKey="last_sign_in_at" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortTh label="AI Jobs" sortKey="ai_jobs_count" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortTh label="AI Cost" sortKey="ai_jobs_cost" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortTh label="Shorts" sortKey="shorts_count" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortTh label="Shorts Cost" sortKey="shorts_cost" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
                <SortTh label="Total" sortKey="total_cost" current={sortKey} asc={sortAsc} onSort={toggleSort} className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sorted.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="px-4 py-3 font-medium truncate max-w-[220px]">{u.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.ai_jobs_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtUSD(u.ai_jobs_cost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.shorts_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtUSD(u.shorts_cost)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-purple-400">{fmtUSD(u.total_cost)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-zinc-500">
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Components ───────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-zinc-800">{icon}</div>
      <div>
        <p className="text-xs text-zinc-400">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  )
}

function SortTh({
  label,
  sortKey,
  current,
  asc,
  onSort,
  className = '',
}: {
  label: string
  sortKey: keyof UserWithStats
  current: keyof UserWithStats
  asc: boolean
  onSort: (k: keyof UserWithStats) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <th
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${active ? 'text-purple-400' : 'text-zinc-600'}`} />
      </span>
    </th>
  )
}
