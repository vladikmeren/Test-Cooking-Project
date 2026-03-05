// netlify/functions/extract-recipe.mjs
// Server-side Anthropic call — API key never reaches the browser

function detectPlatform(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be/.test(u))         return 'youtube'
  if (/instagram\.com\/(reel|p)\//.test(u))     return 'instagram_reel'
  if (/instagram\.com/.test(u))                 return 'instagram'
  if (/threads\.net/.test(u))                   return 'threads'
  if (/tiktok\.com/.test(u))                    return 'tiktok'
  if (/pinterest\.com/.test(u))                 return 'pinterest'
  return 'website'
}

const SOCIAL = new Set(['instagram_reel','instagram','threads','tiktok','pinterest'])
const CATEGORIES = ['chicken','minced','potato','sides','pasta','salmon','seafood','vegetables','salads','breakfast','dinner','desserts']

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), { status: 500 })
  }

  let body
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }) }

  const { url, customName = '' } = body
  if (!url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400 })

  const platform   = detectPlatform(url)
  const needsSearch = SOCIAL.has(platform)
  const isVideo    = ['youtube','instagram_reel','tiktok'].includes(platform)

  const systemPrompt = `You are a recipe extraction assistant. Given a URL, extract all available recipe information.
${needsSearch ? 'This is a social media link — use web_search to find the recipe content.' : 'Use web_search to get recipe details from the page.'}

Valid categories: ${CATEGORIES.join(', ')}

Respond ONLY with a valid JSON object (no markdown, no code fences, no extra text):
{
  "title": "Recipe name in Russian",
  "title_en": "Recipe name in English",
  "description": "2 appetizing sentences describing the dish in Russian",
  "description_en": "2 appetizing sentences in English",
  "time_minutes": 30,
  "difficulty": "easy",
  "servings": "4",
  "category": "pasta",
  "tags": ["tag1","tag2"],
  "ingredients": ["200g pasta","2 eggs"],
  "steps": ["Boil water","Cook pasta"],
  "source_type": "${isVideo ? 'video' : 'website'}",
  "platform": "${platform}"
}`

  const userMsg = `URL: ${url}${customName ? `\nRecipe name hint: "${customName}"` : ''}`

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userMsg }],
      }),
    })

    const rawText = await resp.text()

    if (!resp.ok) {
      console.error('Anthropic API error:', resp.status, rawText)
      throw new Error(`Anthropic error ${resp.status}: ${rawText.slice(0, 200)}`)
    }

    const data = JSON.parse(rawText)

    // Find the last text block (after tool use)
    const textBlocks = (data.content || []).filter(b => b.type === 'text')
    if (!textBlocks.length) {
      console.error('No text blocks in response:', JSON.stringify(data.content))
      throw new Error('AI returned no text response')
    }

    const raw = textBlocks[textBlocks.length - 1].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in:', raw.slice(0, 300))
      throw new Error('AI did not return JSON')
    }

    const recipe = JSON.parse(jsonMatch[0])
    return new Response(JSON.stringify(recipe), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('extract-recipe error:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
