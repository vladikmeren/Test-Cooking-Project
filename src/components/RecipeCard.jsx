import { Clock, Users } from 'lucide-react'
import { CATEGORIES } from '../i18n.js'
import { PLATFORM_META, getDomain } from '../lib/api.js'

function getDifficultyColor(d) {
  if (d === 'easy') return { bg: 'rgba(90,122,58,0.15)',  text: 'var(--accent)' }
  if (d === 'hard') return { bg: 'rgba(200,60,30,0.15)',  text: '#c83c1e' }
  return              { bg: 'rgba(200,140,40,0.15)', text: '#c87c20' }
}

export default function RecipeCard({ recipe, lang, t, onClick }) {
  const platform = recipe.platform || 'website'
  const meta     = PLATFORM_META[platform] || PLATFORM_META.website
  // Support both old `category` string and new `categories` array
  const catKeys  = recipe.categories?.length ? recipe.categories
                   : recipe.category ? [recipe.category] : []
  const cats     = catKeys.map(k => CATEGORIES.find(c => c.key === k)).filter(Boolean)
  const firstCat = cats[0]
  const title    = lang === 'en' && recipe.title_en ? recipe.title_en : recipe.title
  const diff     = getDifficultyColor(recipe.difficulty)

  return (
    <article onClick={onClick} style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
      transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
      boxShadow: 'var(--shadow)',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='var(--shadow-lg)'; e.currentTarget.style.borderColor='var(--border-2)' }}
    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='var(--shadow)'; e.currentTarget.style.borderColor='var(--border)' }}
    >
      {/* Thumbnail */}
      <div style={{ height: 200, background: 'var(--bg-2)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {recipe.thumbnail ? (
          <img src={recipe.thumbnail} alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display='none'; e.target.parentNode.querySelector('.fallback-emoji').style.display='flex' }} />
        ) : null}
        <div className="fallback-emoji" style={{
          display: recipe.thumbnail ? 'none' : 'flex',
          position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center',
          fontSize: 64, background: 'linear-gradient(135deg, var(--bg-2) 0%, var(--bg) 100%)',
        }}>
          {firstCat?.emoji || '🍽️'}
        </div>

        {/* Platform badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          borderRadius: 8, padding: '3px 9px', fontSize: 11, color: '#fff',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {meta.icon} {meta.label || getDomain(recipe.source_url || '')}
        </div>

        {/* Difficulty badge */}
        {recipe.difficulty && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: diff.bg, backdropFilter: 'blur(6px)',
            borderRadius: 8, padding: '3px 9px', fontSize: 11, color: diff.text, fontWeight: 600,
          }}>
            {recipe.difficulty === 'easy' ? t.easy : recipe.difficulty === 'hard' ? t.hard : t.medium}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px' }}>
        <h3 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 600,
          color: 'var(--text)', lineHeight: 1.3, marginBottom: 7,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{title}</h3>

        <p style={{
          fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 14,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {lang === 'en' && recipe.description_en ? recipe.description_en : recipe.description}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {recipe.time_minutes && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
              <Clock size={13} /> {recipe.time_minutes} {t.minutes}
            </span>
          )}
          {recipe.servings && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
              <Users size={13} /> {recipe.servings}{t.servingsSuffix}
            </span>
          )}
          {/* Show up to 2 category chips */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {cats.slice(0, 2).map(cat => (
              <span key={cat.key} className="tag" style={{ fontSize: 11 }}>
                {cat.emoji} {t[`cat_${cat.key}`]}
              </span>
            ))}
            {cats.length > 2 && (
              <span className="tag" style={{ fontSize: 11 }}>+{cats.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
