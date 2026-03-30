import { create } from 'zustand'
import type { VideoProject, VideoTrack, VideoClip, Caption, PostProject, Platform } from '@/types/project'

export type ExportStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error'

// Maps clipId → object URL for local file blobs
export type ClipBlobMap = Record<string, string>

interface EditorStore {
  project: VideoProject | null
  currentTime: number
  isPlaying: boolean
  selectedClipId: string | null
  selectedTrackId: string | null
  zoom: number
  exportStatus: ExportStatus
  exportProgress: number
  exportBlobUrl: string | null
  showCaptionEditor: boolean
  showClipProperties: boolean
  clipBlobMap: ClipBlobMap
  // actions
  setProject: (project: VideoProject) => void
  updateProject: (updater: (p: VideoProject) => VideoProject) => void
  setCurrentTime: (time: number) => void
  setPlaying: (playing: boolean) => void
  selectClip: (clipId: string | null) => void
  selectTrack: (trackId: string | null) => void
  setZoom: (zoom: number) => void
  setExportStatus: (status: ExportStatus, progress?: number) => void
  setExportBlobUrl: (url: string | null) => void
  toggleCaptionEditor: () => void
  toggleClipProperties: () => void
  registerClipBlob: (clipId: string, url: string) => void
  unregisterClipBlob: (clipId: string) => void
  addTrack: (track: VideoTrack) => void
  updateTrack: (trackId: string, updater: (t: VideoTrack) => VideoTrack) => void
  addClipToTrack: (trackId: string, clip: VideoClip) => void
  updateClip: (clipId: string, updater: (c: VideoClip) => VideoClip) => void
  removeClip: (clipId: string) => void
  addCaption: (caption: Caption) => void
  updateCaption: (captionId: string, updater: (c: Caption) => Caption) => void
  removeCaption: (captionId: string) => void
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  selectedTrackId: null,
  zoom: 1,
  exportStatus: 'idle',
  exportProgress: 0,
  exportBlobUrl: null,
  showCaptionEditor: false,
  showClipProperties: false,
  clipBlobMap: {},

  setProject: (project) => set({ project }),
  updateProject: (updater) => {
    const { project } = get()
    if (!project) return
    set({ project: updater(project) })
  },
  setCurrentTime: (currentTime) => set({ currentTime }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  selectClip: (selectedClipId) => set({ selectedClipId, showClipProperties: !!selectedClipId }),
  selectTrack: (selectedTrackId) => set({ selectedTrackId }),
  setZoom: (zoom) => set({ zoom }),
  setExportStatus: (exportStatus, exportProgress = 0) => set({ exportStatus, exportProgress }),
  setExportBlobUrl: (exportBlobUrl) => set({ exportBlobUrl }),
  toggleCaptionEditor: () => set((s) => ({ showCaptionEditor: !s.showCaptionEditor })),
  toggleClipProperties: () => set((s) => ({ showClipProperties: !s.showClipProperties })),
  registerClipBlob: (clipId, url) =>
    set((s) => ({ clipBlobMap: { ...s.clipBlobMap, [clipId]: url } })),
  unregisterClipBlob: (clipId) =>
    set((s) => {
      const next = { ...s.clipBlobMap }
      delete next[clipId]
      return { clipBlobMap: next }
    }),

  addTrack: (track) =>
    set((s) => {
      if (!s.project) return {}
      return { project: { ...s.project, tracks: [...s.project.tracks, track] } }
    }),

  updateTrack: (trackId, updater) =>
    set((s) => {
      if (!s.project) return {}
      return {
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) => (t.id === trackId ? updater(t) : t)),
        },
      }
    }),

  addClipToTrack: (trackId, clip) => {
    const { updateTrack } = get()
    updateTrack(trackId, (t) => ({ ...t, clips: [...t.clips, clip] }))
  },

  updateClip: (clipId, updater) =>
    set((s) => {
      if (!s.project) return {}
      return {
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) => (c.id === clipId ? updater(c) : c)),
          })),
        },
      }
    }),

  removeClip: (clipId) =>
    set((s) => {
      if (!s.project) return {}
      return {
        project: {
          ...s.project,
          tracks: s.project.tracks.map((t) => ({
            ...t,
            clips: t.clips.filter((c) => c.id !== clipId),
          })),
        },
        selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      }
    }),

  addCaption: (caption) =>
    set((s) => {
      if (!s.project) return {}
      return { project: { ...s.project, captions: [...(s.project.captions ?? []), caption] } }
    }),

  updateCaption: (captionId, updater) =>
    set((s) => {
      if (!s.project) return {}
      return {
        project: {
          ...s.project,
          captions: (s.project.captions ?? []).map((c) => (c.id === captionId ? updater(c) : c)),
        },
      }
    }),

  removeCaption: (captionId) =>
    set((s) => {
      if (!s.project) return {}
      return {
        project: {
          ...s.project,
          captions: (s.project.captions ?? []).filter((c) => c.id !== captionId),
        },
      }
    }),
}))

interface DesignerStore {
  project: PostProject | null
  selectedElementId: string | null
  currentPageIndex: number
  setProject: (project: PostProject) => void
  selectElement: (id: string | null) => void
  setCurrentPage: (index: number) => void
}

export const useDesignerStore = create<DesignerStore>((set) => ({
  project: null,
  selectedElementId: null,
  currentPageIndex: 0,
  setProject: (project) => set({ project }),
  selectElement: (selectedElementId) => set({ selectedElementId }),
  setCurrentPage: (currentPageIndex) => set({ currentPageIndex }),
}))

interface SchedulerStore {
  selectedDate: Date | null
  selectedPlatforms: Platform[]
  setSelectedDate: (date: Date | null) => void
  togglePlatform: (platform: Platform) => void
}

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  selectedDate: null,
  selectedPlatforms: [],
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  togglePlatform: (platform) =>
    set((state) => ({
      selectedPlatforms: state.selectedPlatforms.includes(platform)
        ? state.selectedPlatforms.filter((p) => p !== platform)
        : [...state.selectedPlatforms, platform],
    })),
}))
