import { useState, useRef } from 'react'
import { X, ExternalLink, Clock, Users, Trash2, Pencil, Camera } from 'lucide-react'
import { CATEGORIES } from '../i18n.js'
import { PLATFORM_META, getDomain, uploadImage } from '../lib/api.js'

export default function RecipeDetail({ recipe, lang, t, onClose, onDelete, onEdit }) {
  const [changingPhoto, setChangingPhoto] = useState(false)
  const fileRef = useRef()
  if (!recipe) return null

  const platform = recipe.platform || 'website'
  const meta     = PLATFORM_META[platform] || PLATFORM_META.website
  const cats     = (recipe.categories || [])
    .map(k => CATEGORIES.find(c => c.key === k)).filter(Boolean)
  const title    = lang === 'en' && recipe.title_en ? recipe.title_en : recipe.title
  const desc     = lang === 'en' && recipe.description_en ? recipe.description_en : recipe.description
  const ingr     = recipe.ingredients || []
  const steps    = recipe.steps || []
  const hasFullRecipe = ingr.length > 0 || steps.length > 0

  // Nutrition data
  const hasNutrition = recipe.calories || recipe.protein || recipe.fat || recipe.carbs
  const nutrients = [
    { label: t.calories, value: recipe.calories, color: '#f59e0b', unit: '' },
    { label: t.protein,  value: recipe.protein,  color: '#3b82f6', unit: 'г' },
    { label: t.fat,      value: recipe.fat,       color: '#ef4444', unit: 'г' },
    { label: t.carbs,    value: recipe.carbs,     color: '#22c55e', unit: 'г' },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
        {/* Thumbnail */}
        <div style={{ position: 'relative' }}>
          {recipe.thumbnail ? (
            <div style={{ height: 240, overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
              <img src={recipe.thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
            </div>
          ) : (
            <div style={{
              height: 100, borderRadius: '20px 20px 0 0',
              background: 'var(--bg-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}>🍽️</div>
          )}

          {/* Change photo button */}
          {recipe.is_manual && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={changingPhoto}
              style={{
                position: 'absolute', bottom: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 8,
                color: 'white', padding: '6px 10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
              }}>
              <Camera size={13} /> {changingPhoto ? '...' : '📷'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return
              setChangingPhoto(true)
              try {
                const { url } = await uploadImage(file)
                // Update recipe inline - parent will need to reload
                recipe.thumbnail = url
                // Force re-render by triggering onEdit with updated data
                if (onEdit) onEdit({ ...recipe, thumbnail: url })
              } catch (err) { console.error(err) }
              setChangingPhoto(false)
            }} />
        </div>

        <div style={{ padding: '24px 32px 32px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              {/* Multi-category chips */}
              {cats.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {cats.map(cat => (
                    <span key={cat.key} className="tag accent" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {cat.emoji} {t[`cat_${cat.key}`]}
                    </span>
                  ))}
                </div>
              )}
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>
                {title}
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8, flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>

          {desc && (
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 18 }}>{desc}</p>
          )}

          {/* Nutrition circles */}
          {hasNutrition && (
            <div style={{
              display: 'flex', gap: 10, justifyContent: 'center',
              padding: '16px 0', marginBottom: 18,
              background: 'var(--bg-2)', borderRadius: 14,
            }}>
              {nutrients.map(({ label, value, color, unit }) => value ? (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: '50%',
                    border: `3px solid ${color}`,
                    background: color + '15',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1 }}>{Math.round(value)}</span>
                    {unit && <span style={{ fontSize: 9, color, opacity: 0.8 }}>{unit}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>{label}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Meta strip */}
          <div style={{
            display: 'flex', gap: 20, flexWrap: 'wrap',
            padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            marginBottom: 22,
          }}>
            {recipe.time_minutes && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={16} color="var(--accent)" />
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{recipe.time_minutes} {t.minutes}</span>
              </div>
            )}
            {recipe.servings && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Users size={16} color="var(--accent)" />
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{recipe.servings}{t.servingsSuffix}</span>
              </div>
            )}
            {recipe.difficulty && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 16 }}>
                  {recipe.difficulty === 'easy' ? '😊' : recipe.difficulty === 'hard' ? '😤' : '🙂'}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>
                  {recipe.difficulty === 'easy' ? t.easy : recipe.difficulty === 'hard' ? t.hard : t.medium}
                </span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>{meta.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {meta.label || getDomain(recipe.source_url || '')}
              </span>
            </div>
          </div>

          {/* Full recipe OR link */}
          {hasFullRecipe ? (
            <FullRecipe ingr={ingr} steps={steps} t={t} sourceUrl={recipe.source_url} meta={meta} />
          ) : (
            recipe.source_url && (
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 20px' }}>
                <ExternalLink size={17} />
                {meta.isVideo ? t.viewRecipe : t.openSource} — {meta.label || getDomain(recipe.source_url)}
              </a>
            )
          )}

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
              {recipe.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {recipe.is_manual && onEdit ? (
              <button className="btn btn-secondary" style={{ fontSize: 13, gap: 6 }}
                onClick={() => onEdit(recipe)}>
                <Pencil size={14} /> {t.editRecipe}
              </button>
            ) : <span />}
            <button className="btn btn-ghost" style={{ color: '#c83c1e', fontSize: 13 }}
              onClick={() => onDelete(recipe.id)}>
              <Trash2 size={14} /> {t.deleteRecipe}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FullRecipe({ ingr, steps, t, sourceUrl, meta }) {
  return (
    <div>
      {ingr.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            {t.ingredients}
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {ingr.map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 7 }} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
      {steps.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            {t.steps}
          </h3>
          <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', gap: 14 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  fontWeight: 600, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>{i + 1}</span>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14, marginTop: 8 }}>
          <ExternalLink size={15} /> {t.openSource}
        </a>
      )}
    </div>
  )
}
