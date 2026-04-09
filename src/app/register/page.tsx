'use client'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <Sparkles className="w-10 h-10 text-green-500 mx-auto" />
        <h1 className="text-xl font-bold text-white">Registro Desabilitado</h1>
        <p className="text-sm text-zinc-400">
          O cadastro esta temporariamente fechado. Entre em contato com o administrador para obter acesso.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium text-white transition-colors"
        >
          Ir para Login
        </Link>
      </div>
    </div>
  )
}
