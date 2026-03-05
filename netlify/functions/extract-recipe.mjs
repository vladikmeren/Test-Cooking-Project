// netlify/functions/extract-recipe.mjs
// Server-side Anthropic call — API key never reaches the browser

function detectPlatform(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be/.test(u))              return 'youtube'
  if (/instagram\.com\/(reel|p)\//.test(u))          return 'instagram_reel'
  if (/instagram\.com/.test(u))                      return 'instagram'
  if (/threads\.net/.test(u))                        return 'threads'
  if (/tiktok\.com/.test(u))                         return 'tiktok'
  if (/pinterest\.com/.test(u))                      return 'pinterest'
  return 'website'
}

const SOCIAL = new Set(['instagram_reel','instagram','threads','tiktok','pinterest','facebook','twitter'])

const CATEGORIES = ['chicken','minced','potato','sides','pasta','salmon','seafood','vegetables','salads','breakfast','dinner','desserts']

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 })
  }

  let body
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }) }

  const { url, customName = '' } = body
  if (!url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400 })

  const platform  = detectPlatform(url)
  const needsSearch = SOCIAL.has(platform)
  const isVideo   = ['youtube','instagram_reel','tiktok'].includes(platform)

  const systemPrompt = `You are a recipe assistant. Extract recipe metadata from the given link.
${needsSearch
  ? `The link is from a social network. FIRST call web_search to find the actual recipe content, then fill the JSON.`
  : `Use web_search if the URL alone doesn't reveal enough recipe details.`}

Valid categories: ${CATEGORIES.join(', ')}

Respond ONLY with a raw JSON object (no markdown, no fences):
{
  "title": "Recipe name in Russian (use customName if provided)",
  "title_en": "Recipe name in English",
  "description": "2 appetizing sentences in Russian",
  "description_en": "2 appetizing sentences in English",
  "time_minutes": 30,
  "difficulty": "easy | medium | hard",
  "servings": "4",
  "category": "one from the valid categories list",
  "tags": ["tag1","tag2","tag3"],
  "ingredients": ["ingredient 1","ingredient 2"],
  "steps": ["Step 1 description","Step 2 description"],
  "source_type": "${isVideo ? 'video' : 'website'}",
  "platform": "${platform}"
}`

  const userMsg = `URL: ${url}${customName ? `\nCustom name: "${customName}"` : ''}`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    if (!resp.ok) {
      const e = await resp.text()
      throw new Error(`Anthropic error: ${e}`)
    }

    const data = await resp.json()
    const textBlocks = (data.content || []).filter(b => b.type === 'text')
    if (!textBlocks.length) throw new Error('No text response')

    const raw = textBlocks[textBlocks.length - 1].text.replace(/```json|```/g, '')
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const recipe = JSON.parse(jsonMatch[0])
    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('extract-recipe error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}

export const config = { path: '/api/extract-recipe' }
