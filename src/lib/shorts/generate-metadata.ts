import type { PlatformMetadata, ShortLanguage } from '@/types/shorts'

export async function generatePlatformMetadata(
  title: string,
  script: string,
  language: ShortLanguage,
  apiKey: string,
): Promise<{ metadata: PlatformMetadata; costUsd: number }> {
  const langLabel = language === 'pt-br' ? 'Brazilian Portuguese' : 'English'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://studio.elabdata.com.br',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      messages: [
        {
          role: 'system',
          content: `You are a social media expert. Generate platform-specific metadata for a short video. Output ONLY valid JSON, no code fences. Language: ${langLabel}`,
        },
        {
          role: 'user',
          content: `Video title: "${title}"
Script: "${script}"

Output JSON with this exact structure:
{
  "youtube": { "title": "SEO optimized title max 100 chars", "description": "2-3 paragraphs with keywords", "tags": ["tag1", "tag2", ...up to 15], "category": "Science & Technology" },
  "instagram": { "caption": "engaging caption with emojis max 300 chars", "hashtags": ["#tag1", "#tag2", ...up to 20] },
  "tiktok": { "caption": "short punchy caption max 150 chars", "hashtags": ["#tag1", "#fyp", ...up to 10] }
}`,
        },
      ],
      max_tokens: 1500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenRouter metadata error ${response.status}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content ?? '{}'
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) content = jsonMatch[1].trim()
  if (!content.startsWith('{')) {
    const objMatch = content.match(/\{[\s\S]*\}/)
    if (objMatch) content = objMatch[0]
  }
  const metadata = JSON.parse(content) as PlatformMetadata

  return { metadata, costUsd: 0.005 }
}
