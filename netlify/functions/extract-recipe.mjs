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

// Platforms where we shouldn't even try AI extraction — just return a blank draft
const BLANK_DRAFT_PLATFORMS = new Set(['instagram_reel', 'instagram', 'tiktok', 'threads'])

const CATEGORIES = ['chicken','minced','potato','sides','pasta','salmon','seafood',
  'vegetables','salads','breakfast','lunch','dinner','desserts','soup','appetizers',
  'marinade','smoothie','fresh','alcohol']

function blankDraft(url, customName, platform) {
  return {
    title:          customName || '',
    title_en:       '',
    description:    '',
    description_en: '',
    source_url:     url,
    thumbnail:      null,
    time_minutes:   null,
    difficulty:     'easy',
    servings:       '',
    categories:     [],
    tags:           [],
    ingredients:    [],
    steps:          [],
    source_type:    'video',
    platform,
    _is_draft:      true,
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 })
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

  const platform = detectPlatform(url)

  // For social video platforms — return blank draft immediately, no AI call needed
  if (BLANK_DRAFT_PLATFORMS.has(platform)) {
    return new Response(JSON.stringify(blankDraft(url, customName, platform)), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }

  const isVideo = platform === 'youtube'

  const systemPrompt = `You are a recipe extraction assistant. Extract recipe information from the given URL.
Use the web_search tool to fetch the page content and find the recipe.

For YouTube videos: search for the video title + "рецепт" or "recipe", also check the video description for ingredients and steps.

Valid categories (can pick multiple): ${CATEGORIES.join(', ')}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "title": "Recipe name in Russian",
  "title_en": "Recipe name in English",
  "description": "2 appetizing sentences in Russian",
  "description_en": "2 appetizing sentences in English",
  "time_minutes": 30,
  "difficulty": "easy",
  "servings": "4",
  "categories": ["pasta", "dinner"],
  "tags": ["tag1","tag2"],
  "ingredients": ["200g pasta","2 eggs"],
  "steps": ["Boil water","Cook pasta"],
  "calories": null,
  "protein": null,
  "fat": null,
  "carbs": null,
  "source_type": "${isVideo ? 'video' : 'website'}",
  "platform": "${platform}"
}

If you cannot find recipe details, still return valid JSON with whatever you found — leave arrays empty if needed.`

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
      console.error('Anthropic error:', resp.status, rawText.slice(0, 300))
      // Return blank draft on API error rather than failing
      return new Response(JSON.stringify(blankDraft(url, customName, platform)), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = JSON.parse(rawText)
    const textBlocks = (data.content || []).filter(b => b.type === 'text')

    if (!textBlocks.length) {
      return new Response(JSON.stringify(blankDraft(url, customName, platform)), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }

    const raw = textBlocks[textBlocks.length - 1].text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return new Response(JSON.stringify(blankDraft(url, customName, platform)), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      })
    }

    const recipe = JSON.parse(jsonMatch[0])
    // Ensure categories is array
    if (!Array.isArray(recipe.categories)) {
      recipe.categories = recipe.category ? [recipe.category] : []
      delete recipe.category
    }

    return new Response(JSON.stringify(recipe), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('extract-recipe error:', e.message)
    // Always return a blank draft — never a hard error
    return new Response(JSON.stringify(blankDraft(url, customName, platform)), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  }
}
