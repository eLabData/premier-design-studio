import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createSupabaseServer } from '@/lib/supabase-server'

/**
 * List YouTube channels accessible by the given access token.
 * Called from the channel selector page.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  }

  const { accessToken } = await req.json() as { accessToken: string }

  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  )
  client.setCredentials({ access_token: accessToken })

  const youtube = google.youtube({ version: 'v3', auth: client })

  // Get channels the user owns
  const { data: ownedChannels } = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  })

  const channels = (ownedChannels.items || []).map((ch) => ({
    id: ch.id!,
    title: ch.snippet?.title || '',
    customUrl: ch.snippet?.customUrl || '',
    thumbnail: ch.snippet?.thumbnails?.default?.url || '',
    subscriberCount: ch.statistics?.subscriberCount || '0',
    videoCount: ch.statistics?.videoCount || '0',
  }))

  return NextResponse.json({ channels })
}
