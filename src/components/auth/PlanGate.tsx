'use client'
import { useAuthStore } from '@/lib/auth-store'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface PlanGateProps {
  module: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PlanGate({ module, children, fallback }: PlanGateProps) {
  const { canAccess } = useAuthStore()

  if (canAccess(module)) return <>{children}</>

  const isBusinessOnly =
    module === 'export-4k' || module === 'api-access' || module === 'team'

  return (
    fallback ?? (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Lock className="w-12 h-12 text-zinc-600" />
        <h3 className="text-lg font-semibold text-zinc-100">Recurso Premium</h3>
        <p className="text-sm text-zinc-400 max-w-md">
          Este recurso requer o plano{' '}
          {isBusinessOnly ? 'Business' : 'Pro'}. Faça upgrade para
          desbloquear.
        </p>
        <Link
          href="/settings"
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-medium transition-colors text-white"
        >
          Ver Planos
        </Link>
      </div>
    )
  )
}
