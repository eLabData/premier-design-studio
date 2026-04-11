import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'

export async function GET() {
  try {
    // Auth check
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createSupabaseAdmin()

    // Fetch all ai_jobs and shorts in parallel
    const [jobsRes, shortsRes] = await Promise.all([
      admin.from('ai_jobs').select('id, user_id, model, module, cost_usd, status, created_at').order('created_at', { ascending: false }),
      admin.from('shorts').select('id, user_id, cost_usd, cost_breakdown, status, created_at, title').order('created_at', { ascending: false }),
    ])

    if (jobsRes.error) throw jobsRes.error
    if (shortsRes.error) throw shortsRes.error

    const jobs = jobsRes.data ?? []
    const shorts = shortsRes.data ?? []

    // Aggregate ai_jobs
    const totalJobsCost = jobs.reduce((sum, j) => sum + (j.cost_usd ?? 0), 0)

    const byModule: Record<string, { count: number; cost: number }> = {}
    const byModel: Record<string, { count: number; cost: number }> = {}

    for (const j of jobs) {
      const mod = j.module ?? 'unknown'
      if (!byModule[mod]) byModule[mod] = { count: 0, cost: 0 }
      byModule[mod].count++
      byModule[mod].cost += j.cost_usd ?? 0

      const model = j.model ?? 'unknown'
      if (!byModel[model]) byModel[model] = { count: 0, cost: 0 }
      byModel[model].count++
      byModel[model].cost += j.cost_usd ?? 0
    }

    // Aggregate shorts
    const totalShortsCost = shorts.reduce((sum, s) => sum + (s.cost_usd ?? 0), 0)

    // Active users (distinct)
    const userIds = new Set<string>()
    for (const j of jobs) if (j.user_id) userIds.add(j.user_id)
    for (const s of shorts) if (s.user_id) userIds.add(s.user_id)

    return NextResponse.json({
      jobs: {
        total: jobs.length,
        totalCost: totalJobsCost,
        byModule,
        byModel,
        recent: jobs.slice(0, 20),
      },
      shorts: {
        total: shorts.length,
        totalCost: totalShortsCost,
        recent: shorts.slice(0, 10),
      },
      combined: {
        totalCost: totalJobsCost + totalShortsCost,
        activeUsers: userIds.size,
      },
    })
  } catch (err: unknown) {
    console.error('[admin/analytics] Error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
