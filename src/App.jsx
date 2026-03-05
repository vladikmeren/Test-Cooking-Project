import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { translations } from './i18n.js'
import { fetchRecipes, insertRecipe, deleteRecipeById } from './lib/supabase.js'
import Header from './components/Header.jsx'
import SearchBar from './components/SearchBar.jsx'
import CategoryGrid from './components/CategoryGrid.jsx'
import RecipeCard from './components/RecipeCard.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import AddRecipeModal from './components/AddRecipeModal.jsx'

export default function App() {
  // Theme & language
  const [theme, setTheme] = useState(() => localStorage.getItem('tb-theme') || 'light')
  const [lang, setLang]   = useState(() => localStorage.getItem('tb-lang')  || 'ru')
  const t = translations[lang]

  // Data
  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [dataError, setDataError] = useState('')

  // UI state
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState(null)
  const [selected, setSelected]     = useState(null)   // recipe detail
  const [showAdd, setShowAdd]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tb-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('tb-lang', lang)
  }, [lang])

  // Load recipes
  const loadRecipes = useCallback(async () => {
    setLoading(true); setDataError('')
    try {
      const data = await fetchRecipes({ category, search: search.trim() || undefined })
      setRecipes(data)
    } catch (e) {
      console.error(e)
      setDataError(t.errorLoad)
    }
    setLoading(false)
  }, [category, search, t.errorLoad])

  useEffect(() => {
    const timer = setTimeout(loadRecipes, search ? 350 : 0)
    return () => clearTimeout(timer)
  }, [loadRecipes, search])

  async function handleSave(recipe) {
    const saved = await insertRecipe(recipe)
    setRecipes(prev => [saved, ...prev])
  }

  async function handleDelete(id) {
    if (deleteConfirm !== id) { setDeleteConfirm(id); return }
    try {
      await deleteRecipeById(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
      setSelected(null)
      setDeleteConfirm(null)
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <Header
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        lang={lang}
        toggleLang={() => setLang(l => l === 'ru' ? 'en' : 'ru')}
        t={t}
        onAdd={() => setShowAdd(true)}
      />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Search + filter bar */}
        <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SearchBar value={search} onChange={setSearch} t={t} />
          <CategoryGrid active={category} onSelect={setCategory} t={t} />
        </div>

        {/* Error */}
        {dataError && (
          <div style={{
            padding: '14px 18px', marginBottom: 20,
            background: 'rgba(200,60,30,0.08)', border: '1px solid rgba(200,60,30,0.2)',
            borderRadius: 10, color: '#c83c1e', fontSize: 14,
          }}>{dataError}</div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="recipe-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 200 }} />
                <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 20, width: '70%' }} />
                  <div className="skeleton" style={{ height: 14, width: '90%' }} />
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && recipes.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'var(--text-3)',
          }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🍽️</div>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--text-2)', marginBottom: 8 }}>
              {search || category ? t.noResults : t.noRecipes}
            </p>
            <p style={{ fontSize: 14 }}>
              {search || category ? t.noResultsHint : t.noRecipesHint}
            </p>
            {!search && !category && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 24, padding: '12px 28px', fontSize: 15 }}
                onClick={() => setShowAdd(true)}
              >
                + {t.addRecipe}
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && recipes.length > 0 && (
          <div className="recipe-grid">
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                lang={lang}
                t={t}
                onClick={() => { setSelected(recipe); setDeleteConfirm(null) }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdd && (
        <AddRecipeModal t={t} lang={lang} onSave={handleSave} onClose={() => setShowAdd(false)} />
      )}

      {selected && (
        <RecipeDetail
          recipe={selected}
          lang={lang}
          t={t}
          onClose={() => { setSelected(null); setDeleteConfirm(null) }}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
