import type { Project, PostProject, ScheduledPost } from '@/types/project'

const PROJECTS_KEY = 'pds:projects'
const SCHEDULED_KEY = 'pds:scheduled'

function isClient() {
  return typeof window !== 'undefined'
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function saveProject(project: PostProject): void {
  if (!isClient()) return
  const all = getProjects()
  const idx = all.findIndex((p) => p.id === project.id)
  if (idx >= 0) {
    all[idx] = project
  } else {
    all.push(project)
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all))
}

export function getProjects(): PostProject[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    return raw ? (JSON.parse(raw) as PostProject[]) : []
  } catch {
    return []
  }
}

export function getProject(id: string): PostProject | null {
  return getProjects().find((p) => p.id === id) ?? null
}

export function deleteProject(id: string): void {
  if (!isClient()) return
  const filtered = getProjects().filter((p) => p.id !== id)
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered))
}

export function updateProject(id: string, data: Partial<PostProject>): PostProject | null {
  if (!isClient()) return null
  const all = getProjects()
  const idx = all.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const updated = { ...all[idx], ...data, updated_at: new Date().toISOString() } as PostProject
  all[idx] = updated
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(all))
  return updated
}

// ── Scheduled Posts ───────────────────────────────────────────────────────────

export function saveScheduledPost(post: ScheduledPost): void {
  if (!isClient()) return
  const all = getScheduledPosts()
  const idx = all.findIndex((p) => p.id === post.id)
  if (idx >= 0) {
    all[idx] = post
  } else {
    all.push(post)
  }
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(all))
}

export function getScheduledPosts(): ScheduledPost[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY)
    return raw ? (JSON.parse(raw) as ScheduledPost[]) : []
  } catch {
    return []
  }
}

export function deleteScheduledPost(id: string): void {
  if (!isClient()) return
  const filtered = getScheduledPosts().filter((p) => p.id !== id)
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(filtered))
}

export function updateScheduledPost(id: string, data: Partial<ScheduledPost>): ScheduledPost | null {
  if (!isClient()) return null
  const all = getScheduledPosts()
  const idx = all.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const updated = { ...all[idx], ...data } as ScheduledPost
  all[idx] = updated
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(all))
  return updated
}
