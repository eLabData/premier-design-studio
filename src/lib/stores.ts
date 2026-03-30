import { create } from 'zustand'
import type { VideoProject, PostProject, Platform } from '@/types/project'

interface EditorStore {
  project: VideoProject | null
  currentTime: number
  isPlaying: boolean
  selectedClipId: string | null
  selectedTrackId: string | null
  zoom: number
  setProject: (project: VideoProject) => void
  setCurrentTime: (time: number) => void
  setPlaying: (playing: boolean) => void
  selectClip: (clipId: string | null) => void
  selectTrack: (trackId: string | null) => void
  setZoom: (zoom: number) => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  selectedTrackId: null,
  zoom: 1,
  setProject: (project) => set({ project }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  selectClip: (selectedClipId) => set({ selectedClipId }),
  selectTrack: (selectedTrackId) => set({ selectedTrackId }),
  setZoom: (zoom) => set({ zoom }),
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
