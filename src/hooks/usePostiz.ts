'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getIntegrations,
  POSTIZ_API_KEY_STORAGE,
  type PostizIntegration,
} from '@/lib/postiz'

export function usePostiz() {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(POSTIZ_API_KEY_STORAGE)
    setApiKeyState(stored)
  }, [])

  const refreshIntegrations = useCallback(async (key?: string | null) => {
    const effectiveKey = key ?? apiKey
    if (!effectiveKey) {
      setIntegrations([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getIntegrations(effectiveKey)
      setIntegrations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar integrações')
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  // Fetch integrations whenever apiKey changes
  useEffect(() => {
    refreshIntegrations(apiKey)
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveApiKey = useCallback((key: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(POSTIZ_API_KEY_STORAGE, key)
    setApiKeyState(key)
  }, [])

  const isConnected = integrations.length > 0

  return {
    apiKey,
    setApiKey: setApiKeyState,
    integrations,
    loading,
    error,
    saveApiKey,
    refreshIntegrations,
    isConnected,
  }
}
