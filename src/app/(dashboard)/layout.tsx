'use client'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/layout/Sidebar'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      {/* On mobile, add top padding to account for the fixed top bar (h ~= 53px) */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 pt-[53px] md:pt-0">
        {children}
      </main>
    </div>
  )
}
