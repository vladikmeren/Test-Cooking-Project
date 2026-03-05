import { Sun, Moon, Globe, Plus } from 'lucide-react'

export default function Header({ theme, toggleTheme, lang, toggleLang, t, onAdd }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: theme === 'dark'
        ? 'rgba(18,17,16,0.92)'
        : 'rgba(250,248,244,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.3s',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 26 }}>🍽</span>
          <div>
            <div style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 20, fontWeight: 600,
              color: 'var(--accent)',
              lineHeight: 1.1,
            }}>TasteBook</div>
            <div style={{
              fontSize: 11, color: 'var(--text-3)',
              fontWeight: 300, letterSpacing: '0.04em',
            }}>{t.tagline}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Add button */}
          <button className="btn btn-primary" onClick={onAdd}>
            <Plus size={16} />
            <span style={{ display: 'none' }} className="add-label">{t.addRecipe}</span>
            <style>{`@media(min-width:480px){.add-label{display:inline}}`}</style>
          </button>

          {/* Language toggle */}
          <button
            className="btn btn-ghost"
            onClick={toggleLang}
            title="Switch language"
            style={{ padding: '8px 10px', fontSize: 13, fontWeight: 500 }}
          >
            <Globe size={15} />
            <span style={{ marginLeft: 4 }}>{lang === 'ru' ? 'EN' : 'RU'}</span>
          </button>

          {/* Theme toggle */}
          <button
            className="btn btn-ghost"
            onClick={toggleTheme}
            title="Toggle theme"
            style={{ padding: '8px 10px' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
