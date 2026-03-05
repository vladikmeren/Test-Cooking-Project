import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('⚠️ Supabase env vars missing. Check .env file.')
}

// Works with both legacy anon key (eyJ...) and new publishable key (sb_publishable_...)
export const supabase = createClient(url || '', key || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// ─── DB helpers ────────────────────────────────────────────────────────────

export async function fetchRecipes({ category, search } = {}) {
  let q = supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })

  if (category) q = q.eq('category', category)

  if (search) {
    const s = `%${search}%`
    q = q.or(`title.ilike.${s},title_en.ilike.${s},description.ilike.${s},tags.cs.{${search}}`)
  }

  const { data, error } = await q
  if (error) throw error
  return data
}

export async function insertRecipe(recipe) {
  const { data, error } = await supabase
    .from('recipes')
    .insert([recipe])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecipeById(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}
