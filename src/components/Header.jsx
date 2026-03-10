import { Sun, Moon, Globe, Plus, BookOpen, CalendarDays, ShoppingCart } from 'lucide-react'

export default function Header({ theme, toggleTheme, lang, toggleLang, t, onAdd, page, setPage }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: theme === 'dark' ? 'rgba(14,13,11,0.92)' : 'rgba(247,246,243,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        height: 62, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        {/* Logo */}
        <button
          type="button"
          onClick={() => setPage('recipes')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', flexShrink: 0 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--grad-hero)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(22,163,74,0.35)',
          }}>
            <span style={{ fontSize: 16 }}>🍽</span>
          </div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 19, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--text)' }}>Recipe</span>
            <span style={{ color: 'var(--accent)' }}>Hub</span>
          </div>
        </button>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}>
          <button className={`nav-tab ${page === 'recipes' ? 'active' : ''}`} onClick={() => setPage('recipes')}>
            <BookOpen size={15} />
            <span className="nav-label">{t.navRecipes || 'Рецепты'}</span>
          </button>
          <button className={`nav-tab ${page === 'calendar' ? 'active' : ''}`} onClick={() => setPage('calendar')}>
            <CalendarDays size={15} />
            <span className="nav-label">{t.navCalendar || 'Календарь'}</span>
          </button>
          <button className={`nav-tab ${page === 'shopping' ? 'active' : ''}`} onClick={() => setPage('shopping')}>
            <ShoppingCart size={15} />
            <span className="nav-label">{t.navShopping || 'Покупки'}</span>
          </button>
          <style>{`@media(max-width:480px){.nav-label{display:none}}`}</style>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {page === 'recipes' && (
            <button className="btn btn-primary" onClick={onAdd} style={{ padding: '8px 14px', fontSize: 13 }}>
              <Plus size={15} />
              <span className="add-label">{t.addRecipe}</span>
              <style>{`@media(max-width:540px){.add-label{display:none}}`}</style>
            </button>
          )}
          <button className="btn btn-ghost" onClick={toggleLang} style={{ padding: '7px 10px', fontSize: 12, fontWeight: 600 }}>
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
          <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '7px 10px' }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  )
}
