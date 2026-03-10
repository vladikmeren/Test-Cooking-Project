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

// ─── Meal Plan API ─────────────────────────────────────────────────────────
export async function fetchMealPlans(from, to) {
  const res = await fetch(`/.netlify/functions/meal-plans?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function upsertMealPlan(plan_date, meal_type, recipe_ids, custom_note = '') {
  const res = await fetch('/.netlify/functions/meal-plans', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_date, meal_type, recipe_ids, custom_note }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteMealPlan(date, meal) {
  const res = await fetch(`/.netlify/functions/meal-plans?date=${date}&meal=${meal}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ─── Ingredient Parser for Shopping List ──────────────────────────────────
const UNIT_MAP = {
  'гр': 'г', 'грамм': 'г', 'граммов': 'г', 'грамма': 'г',
  'кг': 'кг', 'килограмм': 'кг', 'кило': 'кг',
  'мл': 'мл', 'миллилитр': 'мл',
  'л': 'л', 'литр': 'л', 'литра': 'л',
  'ст.л': 'ст.л', 'стл': 'ст.л', 'столовая ложка': 'ст.л', 'ст. л': 'ст.л',
  'ч.л': 'ч.л', 'чл': 'ч.л', 'чайная ложка': 'ч.л', 'ч. л': 'ч.л',
  'шт': 'шт', 'штук': 'шт', 'штуки': 'шт',
  'стакан': 'стакан', 'стакана': 'стакан',
  'зубч': 'зубч', 'зубчик': 'зубч', 'зубчика': 'зубч',
  'пучок': 'пучок', 'щепотка': 'щепотка', 'горсть': 'горсть',
}

function normalizeUnit(u) {
  const clean = u.replace(/\./g, '').toLowerCase().trim()
  return UNIT_MAP[clean] || u.toLowerCase().trim()
}

export function parseIngredient(str) {
  const s = str.trim()
  // "200г макарон" / "200 г макарон" / "1кг курицы" / "3 яйца" / "2 ст.л. масла"
  const re = /^(\d+(?:[.,]\d+)?)\s*(г|гр\.?|грамм[а]?|кг|мл|л|шт\.?|ст\.?\s*л\.?|ч\.?\s*л\.?|стакан[а]?|зубч\.?|зубчик[а]?|пучок|горсть|щепотка|кусок|куска)\s*(.+)$/i
  const m = s.match(re)
  if (m) {
    return {
      qty: parseFloat(m[1].replace(',', '.')),
      unit: normalizeUnit(m[2]),
      name: m[3].toLowerCase().trim(),
      raw: s,
    }
  }
  // "3 яйца"
  const m2 = s.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/)
  if (m2) {
    return { qty: parseFloat(m2[1].replace(',', '.')), unit: 'шт', name: m2[2].toLowerCase().trim(), raw: s }
  }
  return { qty: null, unit: '', name: s.toLowerCase().trim(), raw: s }
}

const CATEGORIES_SHOP = [
  { key: 'meat',    label: '🥩 Мясо и птица',       keywords: ['курица','говядина','свинина','фарш','мясо','индейка','баранина','телятина','утка','кролик'] },
  { key: 'fish',    label: '🐟 Рыба и морепродукты', keywords: ['лосось','рыба','тунец','креветки','кальмар','треска','форель','минтай','сельдь','горбуша','морепродукты','скумбрия'] },
  { key: 'dairy',   label: '🥛 Молочное и яйца',     keywords: ['молоко','сметана','сыр','творог','кефир','йогурт','сливки','масло','яйц','ряженка','простокваша','пармезан','моцарелла'] },
  { key: 'veg',     label: '🥦 Овощи',               keywords: ['помидор','огурец','лук','чеснок','морковь','картофель','перец','брокколи','цветная капуста','кабачок','баклажан','шпинат','салат','зелень','петрушка','укроп','кинза','капуста','свекла','тыква','горошек','кукуруза','грибы'] },
  { key: 'fruit',   label: '🍎 Фрукты',              keywords: ['яблоко','банан','лимон','апельсин','груша','виноград','клубника','малина','черника','персик','абрикос','слива','манго','ананас','авокадо'] },
  { key: 'grains',  label: '🌾 Крупы и макароны',    keywords: ['рис','гречка','овсянка','макарон','спагетти','паста','манка','пшено','перловка','булгур','кускус','хлеб','мука','крахмал','лапша','вермишель'] },
  { key: 'oils',    label: '🫙 Масла и соусы',        keywords: ['масло','оливковое','подсолнечное','соус','уксус','майонез','кетчуп','горчица','соевый','вустер'] },
  { key: 'spices',  label: '🧂 Специи',               keywords: ['соль','перец','паприка','куркума','карри','зира','кориандр','базилик','орегано','тимьян','розмарин','лавровый','гвоздика','корица','имбирь','специи','приправа'] },
  { key: 'canned',  label: '🥫 Консервы и бакалея',  keywords: ['томат','консерв','тушен','горошек','кукуруза','фасоль','нут','чечевица','оливки','каперсы'] },
  { key: 'other',   label: '🛒 Прочее',               keywords: [] },
]

export function categorizeIngredient(name) {
  const n = name.toLowerCase()
  for (const cat of CATEGORIES_SHOP) {
    if (cat.keywords.some(k => n.includes(k))) return cat.key
  }
  return 'other'
}

export function aggregateIngredients(ingredientLists) {
  // ingredientLists: string[][] from multiple recipes
  const map = new Map() // key: "name|unit" → {name, unit, qty, category, raws}

  for (const list of ingredientLists) {
    for (const raw of list) {
      if (!raw?.trim()) continue
      const parsed = parseIngredient(raw)
      const mapKey = `${parsed.name}|${parsed.unit}`

      if (map.has(mapKey)) {
        const existing = map.get(mapKey)
        if (parsed.qty !== null && existing.qty !== null) {
          existing.qty += parsed.qty
        } else {
          existing.raws.push(raw)
        }
      } else {
        map.set(mapKey, {
          name: parsed.name,
          unit: parsed.unit,
          qty: parsed.qty,
          category: categorizeIngredient(parsed.name),
          raws: [raw],
          checked: false,
        })
      }
    }
  }

  // Group by category
  const result = {}
  for (const [, item] of map) {
    if (!result[item.category]) result[item.category] = []
    result[item.category].push(item)
  }
  return result
}

export const SHOP_CATEGORIES = CATEGORIES_SHOP
