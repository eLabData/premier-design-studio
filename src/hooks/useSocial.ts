'use client'

import { useState, useEffect, useCallback } from 'react'
import { getIntegrations, connectProvider, disconnectIntegration, type SocialIntegration } from '@/lib/postiz'

export function useSocial() {
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getIntegrations()
      setIntegrations(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const connect = useCallback(async (provider: string) => {
    try {
      setConnecting(provider)
      setError(null)
      const url = await connectProvider(provider)
      const popup = window.open(url, '_blank', 'width=600,height=700')

      if (!popup) {
        setError('Popup bloqueado. Permita popups para este site.')
        setConnecting(null)
        return
      }

      const interval = setInterval(() => {
        if (popup.closed) {
          clearInterval(interval)
          setConnecting(null)
          // Wait a moment for the callback to complete
          setTimeout(() => refresh(), 1000)
        }
      }, 500)

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval)
        setConnecting(null)
      }, 300000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar'
      setError(msg)
      setConnecting(null)
    }
  }, [refresh])

  const disconnect = useCallback(async (integrationId: string) => {
    await disconnectIntegration(integrationId)
    await refresh()
  }, [refresh])

  const isConnected = useCallback((provider: string) => {
    return integrations.some(i => i.provider === provider && !i.disabled)
  }, [integrations])

  return { integrations, loading, error, connect, disconnect, refresh, isConnected, connecting }
}
