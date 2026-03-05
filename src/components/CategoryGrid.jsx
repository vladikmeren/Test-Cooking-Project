import { CATEGORIES } from '../i18n.js'

// active is now a Set of keys (or empty Set = all)
export default function CategoryGrid({ active, onSelect, t }) {
  const activeSet = active instanceof Set ? active : new Set()
  const noneActive = activeSet.size === 0

  function toggle(key) {
    const next = new Set(activeSet)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelect(next.size > 0 ? next : null)
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
      {/* All */}
      <button onClick={() => onSelect(null)} style={chipStyle(noneActive)}>
        {t.allCategories}
      </button>

      {CATEGORIES.map(({ key, emoji }) => {
        const isActive = activeSet.has(key)
        return (
          <button key={key} onClick={() => toggle(key)} style={chipStyle(isActive)}>
            <span style={{ fontSize: 15 }}>{emoji}</span>
            {t[`cat_${key}`] || key}
          </button>
        )
      })}
    </div>
  )
}

function chipStyle(isActive) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 24,
    border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
    background: isActive ? 'var(--accent-light)' : 'var(--bg-2)',
    color: isActive ? 'var(--accent)' : 'var(--text-2)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13, fontWeight: isActive ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
  }
}
