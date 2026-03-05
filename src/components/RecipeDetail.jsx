import { X, ExternalLink, Clock, Users, Trash2, Pencil } from 'lucide-react'
import { CATEGORIES } from '../i18n.js'
import { PLATFORM_META, getDomain } from '../lib/api.js'

export default function RecipeDetail({ recipe, lang, t, onClose, onDelete, onEdit }) {
  if (!recipe) return null

  const platform = recipe.platform || 'website'
  const meta     = PLATFORM_META[platform] || PLATFORM_META.website
  const cat      = CATEGORIES.find(c => c.key === recipe.category)
  const title    = lang === 'en' && recipe.title_en ? recipe.title_en : recipe.title
  const desc     = lang === 'en' && recipe.description_en ? recipe.description_en : recipe.description
  const ingr     = recipe.ingredients || []
  const steps    = recipe.steps || []

  const hasFullRecipe = ingr.length > 0 || steps.length > 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 660 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Thumbnail */}
        {recipe.thumbnail && (
          <div style={{ height: 260, overflow: 'hidden', borderRadius: '20px 20px 0 0', position: 'relative' }}>
            <img src={recipe.thumbnail} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
            }} />
          </div>
        )}

        <div style={{ padding: '28px 32px 32px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              {cat && (
                <span className="tag accent" style={{ marginBottom: 8, display: 'inline-flex' }}>
                  {cat.emoji} {t[`cat_${cat.key}`]}
                </span>
              )}
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>
                {title}
              </h2>
            </div>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: 8, flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          {desc && (
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 20 }}>
              {desc}
            </p>
          )}

          {/* Meta strip */}
          <div style={{
            display: 'flex', gap: 20, flexWrap: 'wrap',
            padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            marginBottom: 24,
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

          {/* Full recipe OR link — toggle */}
          {hasFullRecipe ? (
            <FullRecipe ingr={ingr} steps={steps} t={t} sourceUrl={recipe.source_url} meta={meta} />
          ) : (
            recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px 20px' }}
              >
                <ExternalLink size={17} />
                {meta.isVideo ? t.viewRecipe : t.openSource} — {meta.label || getDomain(recipe.source_url)}
              </a>
            )
          )}

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 20 }}>
              {recipe.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {recipe.is_manual && onEdit ? (
              <button
                className="btn btn-secondary"
                style={{ fontSize: 13, gap: 6 }}
                onClick={() => onEdit(recipe)}
              >
                <Pencil size={14} /> {t.editRecipe || 'Редактировать'}
              </button>
            ) : <span />}
            <button
              className="btn btn-ghost"
              style={{ color: '#c83c1e', fontSize: 13 }}
              onClick={() => onDelete(recipe.id)}
            >
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
        <section style={{ marginBottom: 24 }}>
          <h3 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 18, fontWeight: 600, marginBottom: 12,
          }}>{t.ingredients}</h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ingr.map((item, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)', flexShrink: 0, marginTop: 7,
                }} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h3 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 18, fontWeight: 600, marginBottom: 12,
          }}>{t.steps}</h3>
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
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14, marginTop: 8 }}
        >
          <ExternalLink size={15} />
          {t.openSource}
        </a>
      )}
    </div>
  )
}
