import { CATEGORIES } from '../i18n.js'

export default function CategoryGrid({ active, onSelect, t }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      padding: '4px 0',
    }}>
      {/* All */}
      <button
        onClick={() => onSelect(null)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          borderRadius: 24,
          border: `1.5px solid ${!active ? 'var(--accent)' : 'var(--border)'}`,
          background: !active ? 'var(--accent-light)' : 'var(--bg-2)',
          color: !active ? 'var(--accent)' : 'var(--text-2)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13, fontWeight: !active ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {t.allCategories}
      </button>

      {CATEGORIES.map(({ key, emoji }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onSelect(isActive ? null : key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              borderRadius: 24,
              border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              background: isActive ? 'var(--accent-light)' : 'var(--bg-2)',
              color: isActive ? 'var(--accent)' : 'var(--text-2)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 15 }}>{emoji}</span>
            {t[`cat_${key}`] || key}
          </button>
        )
      })}
    </div>
  )
}
