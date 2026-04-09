import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { SUPER_ADMIN_EMAIL } from '@/lib/shorts-config'

export async function GET() {
  try {
    // Auth check — must be super admin
    const supabaseServer = await createSupabaseServer()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use service role to bypass RLS
    const admin = createSupabaseAdmin()

    // Fetch all auth users
    const { data: { users }, error: usersError } = await admin.auth.admin.listUsers()
    if (usersError) throw usersError

    // Fetch all jobs and shorts, aggregate in-memory
    const { data: jobs } = await admin
      .from('ai_jobs')
      .select('user_id, cost_usd, created_at')

    const { data: shorts } = await admin
      .from('shorts')
      .select('user_id, cost_usd, created_at')

    // Aggregate jobs by user
    const jobsByUser = new Map<string, { count: number; total_cost: number; last_date: string | null }>()
    for (const job of jobs || []) {
      const entry = jobsByUser.get(job.user_id) || { count: 0, total_cost: 0, last_date: null }
      entry.count++
      entry.total_cost += job.cost_usd || 0
      if (!entry.last_date || job.created_at > entry.last_date) {
        entry.last_date = job.created_at
      }
      jobsByUser.set(job.user_id, entry)
    }

    // Aggregate shorts by user
    const shortsByUser = new Map<string, { count: number; total_cost: number; last_date: string | null }>()
    for (const s of shorts || []) {
      const entry = shortsByUser.get(s.user_id) || { count: 0, total_cost: 0, last_date: null }
      entry.count++
      entry.total_cost += s.cost_usd || 0
      if (!entry.last_date || s.created_at > entry.last_date) {
        entry.last_date = s.created_at
      }
      shortsByUser.set(s.user_id, entry)
    }

    // Combine
    const combined = users.map((u) => {
      const jStats = jobsByUser.get(u.id)
      const sStats = shortsByUser.get(u.id)
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        ai_jobs: {
          count: jStats?.count || 0,
          total_cost_usd: Math.round((jStats?.total_cost || 0) * 10000) / 10000,
          last_job_at: jStats?.last_date || null,
        },
        shorts: {
          count: sStats?.count || 0,
          total_cost_usd: Math.round((sStats?.total_cost || 0) * 10000) / 10000,
          last_short_at: sStats?.last_date || null,
        },
      }
    })

    return NextResponse.json({ users: combined })
  } catch (err) {
    console.error('[admin/users]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    )
  }
}
