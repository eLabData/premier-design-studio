'use client'
import { useState, useEffect } from 'react'
import Link from "next/link";
import {
  Video,
  Image,
  Calendar,
  FolderOpen,
  Plus,
  Sparkles,
  Palette,
  BarChart3,
  Crown,
  LogIn,
  ArrowRight,
  Camera,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { VERSION } from "@/lib/version";

const modules = [
  {
    title: "Editor de Vídeo",
    description: "Corte, overlay, legendas, transições",
    icon: Video,
    href: "/editor",
    color: "from-green-500/20 to-green-600/5",
    borderColor: "border-green-500/30",
    module: "editor",
    pro: false,
  },
  {
    title: "Designer de Posts",
    description: "Feed, stories, carrossel, thumbnails",
    icon: Image,
    href: "/designer",
    color: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/30",
    module: "designer",
    pro: false,
  },
  {
    title: "Editor de Fotos",
    description: "Filtros, ajustes, chat com IA",
    icon: Camera,
    href: "/photos",
    color: "from-orange-500/20 to-orange-600/5",
    borderColor: "border-orange-500/30",
    module: "designer",
    pro: false,
  },
  {
    title: "Studio AI",
    description: "Logos, mockups, assets com IA",
    icon: Palette,
    href: "/studio",
    color: "from-pink-500/20 to-pink-600/5",
    borderColor: "border-pink-500/30",
    module: "studio",
    pro: true,
  },
  {
    title: "Agendador",
    description: "Publique em todas as plataformas",
    icon: Calendar,
    href: "/scheduler",
    color: "from-blue-500/20 to-blue-600/5",
    borderColor: "border-blue-500/30",
    module: "scheduler",
    pro: true,
  },
  {
    title: "Biblioteca",
    description: "Seus projetos, templates e mídias",
    icon: FolderOpen,
    href: "/library",
    color: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/30",
    module: "library",
    pro: false,
  },
  {
    title: "Analytics",
    description: "Custos, uso de IA e métricas",
    icon: BarChart3,
    href: "/analytics",
    color: "from-cyan-500/20 to-cyan-600/5",
    borderColor: "border-cyan-500/30",
    module: "analytics",
    pro: true,
  },
];

export default function Home() {
  const { user, profile, canAccess } = useAuthStore();
  const plan = profile?.plan ?? 'free';

  // Unauthenticated: landing page
  if (!user) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-4 md:p-8 bg-zinc-950">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative w-full max-w-4xl space-y-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-green-500" />
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100">
                Premier Design Studio
              </h1>
            </div>
            <p className="text-zinc-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed">
              Editor de vídeo, designer de posts e publicação automática com IA — tudo em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors text-base shadow-lg shadow-green-900/30"
              >
                <Plus className="w-5 h-5" />
                Começar grátis
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white font-medium transition-colors text-base"
              >
                <LogIn className="w-5 h-5" />
                Entrar
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <div
                key={mod.href}
                className={`relative overflow-hidden rounded-xl border ${mod.borderColor} bg-gradient-to-br ${mod.color} p-6`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <mod.icon className="w-6 h-6 text-zinc-200" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-100">{mod.title}</h2>
                      {mod.pro && (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{mod.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: dashboard
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen p-4 md:p-8 bg-zinc-950">
      <div className="w-full max-w-4xl space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-green-500" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                Premier Design Studio
              </h1>
            </div>
            <p className="text-zinc-500 text-sm pl-10">
              Bem-vindo, {profile?.full_name ?? user.email}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded font-medium ${
                plan === 'business'
                  ? 'bg-amber-500/20 text-amber-400'
                  : plan === 'pro'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-zinc-700 text-zinc-400'
              }`}>
                {plan === 'free' ? 'Gratuito' : plan === 'pro' ? 'Pro' : 'Business'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg"
            >
              Configurações
            </Link>
            <button
              onClick={() => {
                window.location.href = '/api/auth/logout'
              }}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors border border-zinc-800 hover:border-red-500/30 px-3 py-1.5 rounded-lg"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const accessible = canAccess(mod.module);
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`group relative overflow-hidden rounded-xl border ${mod.borderColor} bg-gradient-to-br ${mod.color} p-6 transition-all hover:scale-[1.02] hover:shadow-lg ${
                  !accessible ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <mod.icon className="w-6 h-6 text-zinc-200" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-zinc-100">{mod.title}</h2>
                      {mod.pro && plan === 'free' && (
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mt-1">{mod.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Action */}
        <div className="flex justify-center">
          <Link
            href="/editor"
            className="flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 shadow-lg shadow-green-900/30"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </Link>
        </div>

        {/* Upgrade prompt for free users */}
        {plan === 'free' && (
          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <Crown className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-zinc-400 flex-1">
              <span className="text-zinc-200 font-medium">Desbloqueie o plano Pro</span> — Studio AI, Agendador, Analytics e muito mais a partir de R$49/mês.
            </p>
            <Link
              href="/settings"
              className="shrink-0 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-medium text-white transition-colors"
            >
              Ver planos
            </Link>
          </div>
        )}

        {/* Social connections quick view */}
        <DashboardConnections />

        {/* Admin section — super admin only */}
        {user.email === 'rafael@elabdata.com.br' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Admin</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/admin/fal"
                className="group relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-600/5 p-6 transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-red-900/50 p-3">
                    <Shield className="w-6 h-6 text-red-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-zinc-100">fal.ai Admin</h2>
                    <p className="text-sm text-zinc-400 mt-1">Billing, uso, API keys</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1 shrink-0" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Version footer */}
        <p className="text-center text-[10px] text-zinc-700 pt-4">
          Premier Design Studio v{VERSION}
        </p>
      </div>
    </div>
  );
}

function DashboardConnections() {
  const [integrations, setIntegrations] = useState<Array<{ id: string; provider: string; account_name: string }>>([])

  useEffect(() => {
    fetch('/api/social/integrations')
      .then(r => r.ok ? r.json() : [])
      .then(setIntegrations)
      .catch(() => {})
  }, [])

  const providerIcons: Record<string, string> = {
    youtube: '▶', instagram: '📷', facebook: '🌐', tiktok: '♪', x: '𝕏', linkedin: '💼',
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Redes Conectadas</p>
        <Link href="/settings/connections" className="text-xs text-green-500 hover:text-green-400 transition-colors">
          Gerenciar
        </Link>
      </div>
      {integrations.length === 0 ? (
        <Link
          href="/settings/connections"
          className="flex items-center justify-center gap-2 py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Nenhuma rede conectada — clique para conectar
        </Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          {integrations.map((i) => (
            <span key={i.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
              <span>{providerIcons[i.provider] || '🔗'}</span>
              {i.account_name || i.provider}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
