"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Video,
  DollarSign,
  TrendingDown,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModuleUsage {
  name: string;
  calls: number;
  tokens: number | null;
  costUsd: number;
  pct: number;
}

interface ModelUsage {
  model: string;
  provider: string;
  calls: number;
  tokens: number | null;
  costUsd: number;
}

interface Session {
  date: string;
  filename: string;
  durationLabel: string;
  sizeMb: number;
  costUsd: number;
  editingTimeMin: number;
  status: "done" | "processing" | "failed";
}

interface UserCost {
  userId: string;
  totalVideos: number;
  totalCostUsd: number;
  avgCostUsd: number;
}

interface AnalyticsData {
  totalVideos: number;
  totalCost: number;
  avgCostPerVideo: number;
  avgEditingTimeMin: number;
  activeUsers: number;
  moduleUsage: ModuleUsage[];
  modelUsage: ModelUsage[];
  sessions: Session[];
  userCosts: UserCost[];
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
// Replace this with a real `src/lib/analytics.ts` call when available.

function getMockData(): AnalyticsData {
  return {
    totalVideos: 47,
    totalCost: 22.5,
    avgCostPerVideo: 0.48,
    avgEditingTimeMin: 2.8,
    activeUsers: 3,

    moduleUsage: [
      { name: "Transcrição (Whisper)", calls: 45, tokens: null, costUsd: 2.7, pct: 12 },
      { name: "Análise (Claude)", calls: 45, tokens: 125000, costUsd: 8.5, pct: 38 },
      { name: "B-Roll (Pexels)", calls: 180, tokens: null, costUsd: 0.0, pct: 0 },
      { name: "Legendas IA", calls: 90, tokens: 15000, costUsd: 1.2, pct: 5 },
      { name: "Copy p/ Posts", calls: 30, tokens: 8000, costUsd: 0.8, pct: 4 },
      { name: "Render Vídeo", calls: 45, tokens: null, costUsd: 4.5, pct: 20 },
      { name: "Logo IA", calls: 20, tokens: 10000, costUsd: 2.0, pct: 9 },
      { name: "Mockups", calls: 15, tokens: 12000, costUsd: 1.8, pct: 8 },
      { name: "Store Assets", calls: 10, tokens: 5000, costUsd: 0.5, pct: 2 },
    ],

    modelUsage: [
      { model: "claude-sonnet-4", provider: "OpenRouter", calls: 120, tokens: 80000, costUsd: 6.4 },
      { model: "whisper-large-v3", provider: "OpenAI", calls: 45, tokens: null, costUsd: 2.7 },
      { model: "gpt-4o-mini", provider: "OpenRouter", calls: 60, tokens: 30000, costUsd: 0.9 },
      { model: "claude-haiku-4.5", provider: "OpenRouter", calls: 90, tokens: 15000, costUsd: 1.2 },
    ],

    sessions: [
      { date: "30/03", filename: "video1.mp4", durationLabel: "10:23", sizeMb: 245, costUsd: 0.62, editingTimeMin: 3, status: "done" },
      { date: "29/03", filename: "talk2.mp4", durationLabel: "5:10", sizeMb: 120, costUsd: 0.31, editingTimeMin: 2, status: "done" },
      { date: "29/03", filename: "entrevista.mp4", durationLabel: "22:47", sizeMb: 560, costUsd: 1.37, editingTimeMin: 5, status: "done" },
      { date: "28/03", filename: "podcast_ep12.mp4", durationLabel: "45:00", sizeMb: 1100, costUsd: 2.70, editingTimeMin: 8, status: "done" },
      { date: "28/03", filename: "reel_promo.mp4", durationLabel: "1:30", sizeMb: 38, costUsd: 0.09, editingTimeMin: 1, status: "failed" },
      { date: "27/03", filename: "webinar_mar.mp4", durationLabel: "58:12", sizeMb: 1420, costUsd: 3.49, editingTimeMin: 10, status: "done" },
      { date: "26/03", filename: "short_tips.mp4", durationLabel: "2:15", sizeMb: 55, costUsd: 0.14, editingTimeMin: 1, status: "processing" },
    ],

    userCosts: [
      { userId: "maira@studio.com", totalVideos: 28, totalCostUsd: 13.44, avgCostUsd: 0.48 },
      { userId: "ana@studio.com", totalVideos: 12, totalCostUsd: 5.76, avgCostUsd: 0.48 },
      { userId: "carlos@studio.com", totalVideos: 7, totalCostUsd: 3.36, avgCostUsd: 0.48 },
    ],
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRL_RATE = 5.5;

function fmtUsd(v: number) {
  return `$${v.toFixed(2)}`;
}

function fmtBrl(v: number) {
  return `R$${(v * BRL_RATE).toFixed(2)}`;
}

function fmtTokens(t: number | null) {
  if (t === null) return "—";
  if (t >= 1000) return `${(t / 1000).toFixed(0)}K`;
  return String(t);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex gap-4 items-start">
      <div className={`rounded-lg p-2.5 ${accent ?? "bg-zinc-800"}`}>
        <Icon className="w-5 h-5 text-zinc-100" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Concluído
      </span>
    );
  if (status === "processing")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Processando
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
      <AlertCircle className="w-3.5 h-3.5" />
      Falhou
    </span>
  );
}

// Module usage bar — colored bg proportional to % of total
function ModuleRow({ mod, maxPct }: { mod: ModuleUsage; maxPct: number }) {
  const barWidth = maxPct > 0 ? (mod.pct / maxPct) * 100 : 0;
  return (
    <div className="relative group">
      {/* background bar */}
      <div
        className="absolute inset-0 rounded bg-green-500/10 transition-all"
        style={{ width: `${barWidth}%` }}
      />
      <div className="relative grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 items-center px-3 py-2.5 text-sm">
        <span className="text-zinc-200 truncate">{mod.name}</span>
        <span className="text-zinc-400 text-right tabular-nums">{mod.calls.toLocaleString("pt-BR")}</span>
        <span className="text-zinc-400 text-right tabular-nums w-14">{fmtTokens(mod.tokens)}</span>
        <span className="text-zinc-300 text-right tabular-nums w-16">{fmtUsd(mod.costUsd)}</span>
        <span className="text-zinc-500 text-right tabular-nums w-20">{fmtBrl(mod.costUsd)}</span>
        <span className="text-zinc-400 text-right tabular-nums w-10">{mod.pct}%</span>
      </div>
    </div>
  );
}

// ── Cost estimator ────────────────────────────────────────────────────────────

function CostEstimator() {
  const [videos, setVideos] = useState(20);
  const [avgMin, setAvgMin] = useState(10);

  const whisperRate = 0.006; // per minute
  const claudePerVideo = 0.05;
  const renderPerVideo = 0.5;

  const monthly =
    videos * (whisperRate * avgMin + claudePerVideo + renderPerVideo);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      <SectionTitle>Estimativa de Custos</SectionTitle>

      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-300">Vídeos por mês</span>
            <span className="text-white font-semibold">{videos}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={videos}
            onChange={(e) => setVideos(Number(e.target.value))}
            className="w-full accent-green-500 h-1.5 rounded-full bg-zinc-700 appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>1</span>
            <span>100</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-300">Duração média (min)</span>
            <span className="text-white font-semibold">{avgMin} min</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={avgMin}
            onChange={(e) => setAvgMin(Number(e.target.value))}
            className="w-full accent-green-500 h-1.5 rounded-full bg-zinc-700 appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>1 min</span>
            <span>60 min</span>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-5 space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Custo Estimado / Mês</p>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-white">{fmtUsd(monthly)}</span>
          <span className="text-xl text-zinc-400 mb-1">{fmtBrl(monthly)}</span>
        </div>
        <p className="text-xs text-zinc-600">
          Whisper {fmtUsd(whisperRate)}/min · Claude {fmtUsd(claudePerVideo)}/vídeo · Render {fmtUsd(renderPerVideo)}/vídeo
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const data = getMockData();
  const maxModulePct = Math.max(...data.moduleUsage.map((m) => m.pct));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Painel de Custos e Uso</h1>
          <p className="text-xs text-zinc-500">Dados simulados — integre src/lib/analytics.ts para dados reais</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryCard
            label="Vídeos Processados"
            value={data.totalVideos.toString()}
            icon={Video}
            accent="bg-green-500/20"
          />
          <SummaryCard
            label="Custo Total"
            value={fmtUsd(data.totalCost)}
            sub={fmtBrl(data.totalCost)}
            icon={DollarSign}
            accent="bg-blue-500/20"
          />
          <SummaryCard
            label="Custo Médio/Vídeo"
            value={fmtUsd(data.avgCostPerVideo)}
            sub={fmtBrl(data.avgCostPerVideo)}
            icon={TrendingDown}
            accent="bg-purple-500/20"
          />
          <SummaryCard
            label="Tempo Médio de Edição"
            value={`${data.avgEditingTimeMin} min`}
            icon={Clock}
            accent="bg-amber-500/20"
          />
          <SummaryCard
            label="Usuários Ativos"
            value={data.activeUsers.toString()}
            icon={Users}
            accent="bg-pink-500/20"
          />
        </div>

        {/* Uso por Módulo */}
        <section>
          <SectionTitle>Uso por Módulo</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-2 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
              <span>Módulo</span>
              <span className="text-right">Chamadas</span>
              <span className="text-right w-14">Tokens</span>
              <span className="text-right w-16">Custo (USD)</span>
              <span className="text-right w-20">Custo (BRL)</span>
              <span className="text-right w-10">% Total</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {data.moduleUsage.map((mod) => (
                <ModuleRow key={mod.name} mod={mod} maxPct={maxModulePct} />
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-3 py-2.5 border-t border-zinc-800 text-sm font-semibold text-zinc-300">
              <span>Total</span>
              <span className="text-right tabular-nums">
                {data.moduleUsage.reduce((s, m) => s + m.calls, 0).toLocaleString("pt-BR")}
              </span>
              <span className="text-right w-14">—</span>
              <span className="text-right w-16">
                {fmtUsd(data.moduleUsage.reduce((s, m) => s + m.costUsd, 0))}
              </span>
              <span className="text-right w-20">
                {fmtBrl(data.moduleUsage.reduce((s, m) => s + m.costUsd, 0))}
              </span>
              <span className="text-right w-10">100%</span>
            </div>
          </div>
        </section>

        {/* Two-column: Modelo + Usuários */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Custo por Modelo */}
          <section>
            <SectionTitle>Custo por Modelo</SectionTitle>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <span>Modelo</span>
                <span className="text-right">Provider</span>
                <span className="text-right">Chamadas</span>
                <span className="text-right">Tokens</span>
                <span className="text-right">Custo</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.modelUsage.map((m) => (
                  <div
                    key={m.model}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 items-center px-4 py-2.5 text-sm"
                  >
                    <span className="text-zinc-200 font-mono text-xs truncate">{m.model}</span>
                    <span className="text-zinc-500 text-right text-xs">{m.provider}</span>
                    <span className="text-zinc-400 text-right tabular-nums">{m.calls}</span>
                    <span className="text-zinc-400 text-right tabular-nums">{fmtTokens(m.tokens)}</span>
                    <span className="text-zinc-300 text-right tabular-nums">{fmtUsd(m.costUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Custo por Usuário */}
          <section>
            <SectionTitle>Custo por Usuário</SectionTitle>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <span>Usuário</span>
                <span className="text-right">Vídeos</span>
                <span className="text-right">Total</span>
                <span className="text-right">Média/Vídeo</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.userCosts.map((u) => (
                  <div
                    key={u.userId}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-4 py-2.5 text-sm"
                  >
                    <span className="text-zinc-200 truncate text-xs">{u.userId}</span>
                    <span className="text-zinc-400 text-right tabular-nums">{u.totalVideos}</span>
                    <span className="text-zinc-300 text-right tabular-nums">{fmtUsd(u.totalCostUsd)}</span>
                    <span className="text-zinc-400 text-right tabular-nums">{fmtUsd(u.avgCostUsd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* Histórico de Sessões */}
        <section>
          <SectionTitle>Histórico de Sessões</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="px-4 py-2 text-left">Data</th>
                    <th className="px-4 py-2 text-left">Vídeo</th>
                    <th className="px-4 py-2 text-right">Duração</th>
                    <th className="px-4 py-2 text-right">Tamanho</th>
                    <th className="px-4 py-2 text-right">Custo</th>
                    <th className="px-4 py-2 text-right">Tempo Edição</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {data.sessions.map((s, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-zinc-500 tabular-nums">{s.date}</td>
                      <td className="px-4 py-2.5 text-zinc-200 font-mono text-xs max-w-[140px] truncate">{s.filename}</td>
                      <td className="px-4 py-2.5 text-zinc-400 text-right tabular-nums">{s.durationLabel}</td>
                      <td className="px-4 py-2.5 text-zinc-400 text-right tabular-nums">{s.sizeMb} MB</td>
                      <td className="px-4 py-2.5 text-zinc-300 text-right tabular-nums font-medium">{fmtUsd(s.costUsd)}</td>
                      <td className="px-4 py-2.5 text-zinc-400 text-right tabular-nums">{s.editingTimeMin} min</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Estimativa de Custos */}
        <CostEstimator />

      </div>
    </div>
  );
}
