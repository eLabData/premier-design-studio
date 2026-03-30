'use client'

import { useState, useCallback } from 'react'
import { useEditorStore } from '@/lib/stores'
import {
  transcribeVideo,
  analyzeTranscript,
  searchBRoll,
} from '@/lib/ai-services'
import type {
  TranscriptResult,
  EditSuggestions,
  BRollResult,
  CaptionStyleName,
} from '@/types/project'
import type { Caption, VideoProject } from '@/types/project'

export type AutoEditStep =
  | 'idle'
  | 'transcribing'
  | 'analyzing'
  | 'searching_broll'
  | 'applying'
  | 'ready'
  | 'error'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function buildDefaultCaptionStyle(): Caption['style'] {
  return {
    fontFamily: 'Inter, sans-serif',
    fontSize: 28,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'bottom',
    animation: 'highlight',
  }
}

export function useAutoEdit() {
  const store = useEditorStore()

  const [step, setStep] = useState<AutoEditStep>('idle')
  const [progress, setProgress] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null)
  const [suggestions, setSuggestions] = useState<EditSuggestions | null>(null)
  const [brollResults, setBrollResults] = useState<BRollResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Individual steps ────────────────────────────────────────────────────────

  const transcribeOnly = useCallback(
    async (videoFile: File): Promise<TranscriptResult> => {
      setStep('transcribing')
      setProgress(5)
      const result = await transcribeVideo(videoFile)
      setTranscript(result)
      setProgress(30)
      return result
    },
    []
  )

  const analyzeOnly = useCallback(
    async (tx: TranscriptResult): Promise<EditSuggestions> => {
      setStep('analyzing')
      setProgress(35)
      const result = await analyzeTranscript(tx)
      setSuggestions(result)
      setProgress(50)
      return result
    },
    []
  )

  const searchBRollOnly = useCallback(
    async (
      keywords: { keyword: string; startTime: number; endTime: number }[]
    ): Promise<BRollResult[]> => {
      setStep('searching_broll')
      setProgress(55)
      const results = await searchBRoll(keywords)
      setBrollResults(results)
      setProgress(70)
      return results
    },
    []
  )

  const applyEdits = useCallback(
    (edits: EditSuggestions, broll: BRollResult[]) => {
      setStep('applying')
      setProgress(75)

      store.updateProject((p: VideoProject): VideoProject => {
        // Build captions from transcript segments (already stored in transcript state)
        const existingTranscript = p.transcript
        const newCaptions: Caption[] = (
          existingTranscript?.segments ?? []
        ).map((seg) => ({
          id: generateId(),
          text: seg.text,
          start_time: seg.startTime,
          end_time: seg.endTime,
          style: buildDefaultCaptionStyle(),
        }))

        return {
          ...p,
          editSuggestions: edits,
          brollClips: broll,
          captions: newCaptions,
          captionStyle: (p.captionStyle ?? 'bold') as CaptionStyleName,
          updated_at: new Date().toISOString(),
        }
      })

      setProgress(95)
    },
    [store]
  )

  // ── Full pipeline ───────────────────────────────────────────────────────────

  const runAutoEdit = useCallback(
    async (videoFile: File) => {
      setError(null)
      setProgress(0)

      try {
        // Step 1: Transcribe (0–30%)
        const tx = await transcribeOnly(videoFile)

        // Store transcript in project
        store.updateProject((p: VideoProject): VideoProject => ({
          ...p,
          transcript: tx,
          updated_at: new Date().toISOString(),
        }))

        // Step 2: Analyze (30–50%)
        const edits = await analyzeOnly(tx)

        // Step 3: Search B-Roll (50–70%)
        const broll = await searchBRollOnly(edits.brollKeywords)

        // Step 4: Apply to project (70–95%)
        applyEdits(edits, broll)

        // Step 5: Ready
        setStep('ready')
        setProgress(100)
      } catch (err) {
        console.error('Erro no pipeline de auto-edição:', err)
        setError(
          err instanceof Error
            ? err.message
            : 'Erro desconhecido durante a edição automática'
        )
        setStep('error')
      }
    },
    [transcribeOnly, analyzeOnly, searchBRollOnly, applyEdits, store]
  )

  // ── Accept / Reject individual suggestions ──────────────────────────────────

  const acceptCut = useCallback(
    (index: number) => {
      setSuggestions((prev) => {
        if (!prev) return prev
        const cuts = [...prev.silenceCuts]
        if (cuts[index]) cuts[index] = { ...cuts[index], accepted: true }
        return { ...prev, silenceCuts: cuts }
      })
    },
    []
  )

  const rejectCut = useCallback(
    (index: number) => {
      setSuggestions((prev) => {
        if (!prev) return prev
        const cuts = [...prev.silenceCuts]
        if (cuts[index]) cuts[index] = { ...cuts[index], accepted: false }
        return { ...prev, silenceCuts: cuts }
      })
    },
    []
  )

  const acceptBRoll = useCallback(
    (index: number, selectedUrl: string) => {
      setBrollResults((prev) => {
        const next = [...prev]
        if (next[index])
          next[index] = { ...next[index], accepted: true, selectedUrl }
        return next
      })
    },
    []
  )

  const rejectBRoll = useCallback(
    (index: number) => {
      setBrollResults((prev) => {
        const next = [...prev]
        if (next[index]) next[index] = { ...next[index], accepted: false }
        return next
      })
    },
    []
  )

  return {
    step,
    progress,
    transcript,
    suggestions,
    brollResults,
    error,
    runAutoEdit,
    transcribeOnly,
    analyzeOnly,
    searchBRollOnly,
    applyEdits,
    acceptCut,
    rejectCut,
    acceptBRoll,
    rejectBRoll,
  }
}
