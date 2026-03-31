'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Crown,
  Check,
  Loader2,
  User,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  LogOut,
  CheckCircle2,
  XCircle,
  Share2,
  ChevronRight,
  Camera,
  Globe,
  Tv,
  Music,
  AtSign,
  Briefcase,
  CheckCircle,
} from 'lucide-react'
import { useSocial } from '@/hooks/useSocial'
import { PROVIDERS } from '@/lib/postiz'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

// ── Plan data ────────────────────────────────────────────────────────────────

interface PlanConfig {
  id: 'free' | 'pro' | 'business'
  name: string
  price: string
  priceId: string
  color: string
  borderColor: string
  features: string[]
}

const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 'R$0',
    priceId: '',
    color: 'from-zinc-800/60 to-zinc-800/30',
    borderColor: 'border-zinc-700',
    features: [
      'Editor básico de vídeo',
      'Designer básico de posts',
      '5 vídeos por mês',
      'Legendas com IA',
      'Marca d\'água',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$49/mês',
    priceId: 'pro_monthly',
    color: 'from-green-900/30 to-green-950/20',
    borderColor: 'border-green-600/40',
    features: [
      'Tudo do Gratuito',
      'Studio AI (logos e mockups)',
      'Agendador de posts',
      'Analytics de uso',
      'Auto-edit com IA',
      'B-Roll automático',
      'Sem marca d\'água',
      '50 vídeos por mês',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$149/mês',
    priceId: 'business_monthly',
    color: 'from-amber-900/20 to-amber-950/10',
    borderColor: 'border-amber-600/40',
    features: [
      'Tudo do Pro',
      'Export em 4K',
      'Acesso à API',
      'Time e colaboração',
      'Vídeos ilimitados',
      'Suporte prioritário',
    ],
  },
]

// ── Social Connections Inline ─────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Camera,
  facebook: Globe,
  youtube: Tv,
  tiktok: Music,
  x: AtSign,
  linkedin: Briefcase,
}

const QUICK_PROVIDERS = ['youtube', 'instagram', 'facebook', 'tiktok', 'x', 'linkedin']

function SocialConnectionsInline() {
  const { integrations, connect, connecting, error } = useSocial()

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-zinc-400" />
        <h2 className="text-base font-semibold text-zinc-100">Redes Sociais</h2>
      </div>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {QUICK_PROVIDERS.map((providerId) => {
          const info = PROVIDERS[providerId]
          if (!info) return null
          const Icon = PROVIDER_ICONS[providerId] || Globe
          const connected = integrations.find(i => i.provider === providerId)
          const isConnecting = connecting === providerId

          return (
            <button
              key={providerId}
              onClick={() => !connected && connect(providerId)}
              disabled={!!connected || isConnecting}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                connected
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              } ${isConnecting ? 'opacity-60' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${info.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{info.name}</p>
                {connected ? (
                  <p className="text-[10px] text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Conectado
                  </p>
                ) : isConnecting ? (
                  <p className="text-[10px] text-zinc-500">Conectando...</p>
                ) : (
                  <p className="text-[10px] text-zinc-500">Clique para conectar</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, setProfile, setUser } = useAuthStore()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const plan = profile?.plan ?? 'free'

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  // Sync name from profile when profile loads
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
  }, [profile?.full_name])

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    setProfileMsg(null)
    try {
    const supabase = createSupabaseBrowser()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      setProfileMsg('Erro ao salvar. Tente novamente.')
    } else {
      setProfile({ ...profile!, full_name: fullName })
      setProfileMsg('Perfil salvo com sucesso.')
    }
    } catch {
      setProfileMsg('Erro ao salvar. Tente novamente.')
    }
    setSavingProfile(false)
    setTimeout(() => setProfileMsg(null), 3000)
  }

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silent fail — in production add a toast
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silent fail
    } finally {
      setPortalLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.href = '/login'
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    const supabase = createSupabaseBrowser()
    // Delete profile — cascade will remove projects etc.
    await supabase.from('profiles').delete().eq('id', user!.id)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/register')
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100">Configurações</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie seu perfil, plano e conta.</p>
          </div>
          <Link href="/" className="shrink-0 text-sm text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg">
            ← Voltar
          </Link>
        </div>

        {/* Stripe feedback banners */}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Upgrade realizado com sucesso! Seu plano foi atualizado.
          </div>
        )}
        {canceled && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-400">
            <XCircle className="w-5 h-5 shrink-0" />
            Processo de pagamento cancelado.
          </div>
        )}

        {/* Profile section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Perfil</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">E-mail</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800 text-sm text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-600">O e-mail não pode ser alterado aqui.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center gap-2"
              >
                {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar perfil
              </button>
              {profileMsg && (
                <span className={`text-xs ${profileMsg.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
                  {profileMsg}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Social connections section */}
        <SocialConnectionsInline />

        {/* Link to full connections page */}
        <section className="space-y-4">
          <Link
            href="/settings/connections"
            className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">Gerenciar todas as conexoes</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Conecte mais plataformas e gerencie permissoes.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
          </Link>
        </section>

        {/* Plans section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Plano</h2>
          </div>

          {/* Current plan info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Plano atual</p>
              <p className="text-base font-semibold text-zinc-100 mt-0.5">
                {plan === 'free' ? 'Gratuito' : plan === 'pro' ? 'Pro' : 'Business'}
              </p>
            </div>
            {plan !== 'free' && (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-60"
              >
                {portalLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Gerenciar assinatura
              </button>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => {
              const isCurrent = plan === p.id
              const isUpgrade =
                (plan === 'free' && (p.id === 'pro' || p.id === 'business')) ||
                (plan === 'pro' && p.id === 'business')

              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl border bg-gradient-to-br ${p.color} ${p.borderColor} p-5 space-y-4 ${
                    isCurrent ? 'ring-2 ring-green-500/30' : ''
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-2.5 left-4 bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Atual
                    </span>
                  )}
                  <div>
                    <h3 className="font-semibold text-zinc-100">{p.name}</h3>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">{p.price}</p>
                  </div>
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isUpgrade && (
                    <button
                      onClick={() => handleCheckout(p.priceId)}
                      disabled={checkoutLoading === p.priceId}
                      className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
                    >
                      {checkoutLoading === p.priceId && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Fazer upgrade
                    </button>
                  )}
                  {isCurrent && (
                    <div className="py-2 text-center text-xs text-zinc-500">
                      Plano ativo
                    </div>
                  )}
                  {!isCurrent && !isUpgrade && (
                    <div className="py-2 text-center text-xs text-zinc-600">
                      Downgrade disponível via portal
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Account actions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-semibold text-zinc-100">Conta</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da conta
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-red-400">Zona de Perigo</h2>
          </div>
          <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Excluir conta</p>
              <p className="text-xs text-zinc-500 mt-1">
                Esta ação é permanente e não pode ser desfeita. Todos os seus projetos serão excluídos.
              </p>
            </div>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-500/40 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Excluir minha conta
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-400 font-medium">
                  Tem certeza? Esta ação é irreversível.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-sm font-medium text-white transition-colors flex items-center gap-2"
                  >
                    {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Sim, excluir tudo
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
