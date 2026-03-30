'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Video,
  Image,
  Palette,
  Calendar,
  FolderOpen,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Crown,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const NAV_ITEMS = [
  { href: '/editor', label: 'Editor de Vídeo', icon: Video, module: 'editor', pro: false },
  { href: '/designer', label: 'Designer', icon: Image, module: 'designer', pro: false },
  { href: '/studio', label: 'Studio AI', icon: Palette, module: 'studio', pro: true },
  { href: '/scheduler', label: 'Agendador', icon: Calendar, module: 'scheduler', pro: true },
  { href: '/library', label: 'Biblioteca', icon: FolderOpen, module: 'library', pro: false },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, module: 'analytics', pro: true },
]

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratuito',
  pro: 'Pro',
  business: 'Business',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  pro: 'bg-green-500/20 text-green-400 border border-green-500/30',
  business: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, setUser, setProfile } = useAuthStore()

  const plan = profile?.plan ?? 'free'

  const handleLogout = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full border-r border-zinc-800 bg-zinc-950">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-800">
        <Sparkles className="w-5 h-5 text-green-500" />
        <span className="font-semibold text-sm text-zinc-100 leading-tight">
          Premier Design
        </span>
      </div>

      {/* User info */}
      <div className="px-3 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-zinc-300">
                {(profile?.full_name ?? profile?.email ?? user?.email ?? 'U')
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-100 truncate">
              {profile?.full_name ?? user?.email ?? 'Usuário'}
            </p>
            <span
              className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${PLAN_COLORS[plan]}`}
            >
              {plan === 'pro' || plan === 'business' ? (
                <span className="flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  {PLAN_LABELS[plan]}
                </span>
              ) : (
                PLAN_LABELS[plan]
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                isActive
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.pro && plan === 'free' && (
                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-2 py-2 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/settings'
              ? 'bg-green-500/15 text-green-400'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
