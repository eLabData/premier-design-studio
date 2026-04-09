'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, Eye, EyeOff } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { VERSION } from '@/lib/version'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.signInWithPassword({ email, password }).catch((e) => ({
      error: { message: e?.message === 'Failed to fetch'
        ? 'Erro de conexão com o banco de dados. Tente novamente em alguns instantes.'
        : e?.message || 'Erro inesperado' },
    }))
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos.'
          : error.message.includes('fetch') || error.message.includes('network')
            ? 'Erro de conexão com o servidor. Verifique sua internet ou tente novamente.'
            : error.message
      )
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <Sparkles className="w-7 h-7 text-green-500" />
            <h1 className="text-2xl font-bold text-zinc-100">Premier Design Studio</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Editor de vídeo, designer de posts e publicação automática com IA
          </p>
          <p className="text-[10px] text-zinc-700">v{VERSION}</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6">Entrar na sua conta</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400">Senha</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">ou</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-zinc-200 transition-colors flex items-center justify-center gap-3"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Entrar com Google
          </button>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Não tem conta?{' '}
            <Link href="/register" className="text-green-400 hover:text-green-300 transition-colors font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
