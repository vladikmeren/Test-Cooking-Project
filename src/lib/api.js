export function detectPlatform(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be/.test(u))             return 'youtube'
  if (/instagram\.com\/(reel|p)\//.test(u))         return 'instagram_reel'
  if (/instagram\.com/.test(u))                     return 'instagram'
  if (/threads\.net/.test(u))                       return 'threads'
  if (/tiktok\.com/.test(u))                        return 'tiktok'
  if (/pinterest\.com/.test(u))                     return 'pinterest'
  if (/facebook\.com/.test(u))                      return 'facebook'
  if (/twitter\.com|x\.com/.test(u))                return 'twitter'
  return 'website'
}

export const PLATFORM_META = {
  youtube:        { label: 'YouTube',   icon: '▶️',  isVideo: true,  needsSearch: false },
  instagram_reel: { label: 'Instagram', icon: '📱',  isVideo: true,  needsSearch: true  },
  instagram:      { label: 'Instagram', icon: '📸',  isVideo: false, needsSearch: true  },
  threads:        { label: 'Threads',   icon: '🧵',  isVideo: false, needsSearch: true  },
  tiktok:         { label: 'TikTok',    icon: '🎵',  isVideo: true,  needsSearch: true  },
  pinterest:      { label: 'Pinterest', icon: '📌',  isVideo: false, needsSearch: true  },
  facebook:       { label: 'Facebook',  icon: '👤',  isVideo: false, needsSearch: true  },
  twitter:        { label: 'X/Twitter', icon: '🐦',  isVideo: false, needsSearch: true  },
  website:        { label: '',          icon: '🌐',  isVideo: false, needsSearch: false },
}

export function getYouTubeThumbnail(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null
}

export function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url }
}

// ─── DB calls ─────────────────────────────────────────────────────────────
export async function fetchRecipes({ categories, search } = {}) {
  const params = new URLSearchParams()
  if (categories && categories.size > 0) params.set('categories', [...categories].join(','))
  if (search) params.set('search', search)
  const res = await fetch(`/.netlify/functions/recipes?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function insertRecipe(recipe) {
  const res = await fetch('/.netlify/functions/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateRecipe(id, recipe) {
  const res = await fetch(`/.netlify/functions/recipes?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteRecipeById(id) {
  const res = await fetch(`/.netlify/functions/recipes?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function uploadImage(file) {
  // Compress client-side → base64 data URL stored directly in DB
  // No Netlify Blobs needed — works on all plans, no URL issues
  const { compressImage } = await import('./imageUtils.js')
  const dataUrl = await compressImage(file)
  return { url: dataUrl }
}

export async function extractRecipeFromUrl(url, customName = '') {
  const res = await fetch('/.netlify/functions/extract-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, customName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
