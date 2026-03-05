import { useState, useEffect } from 'react'

const VALID_LOGIN    = 'Biba&Boba'
const VALID_PASSWORD = 'LolKek123321'
const SESSION_KEY    = 'tb_auth_v1'
const REMEMBER_KEY   = 'tb_remember_v1'
// Token stored in localStorage — tied to device+browser (best we can do client-side)
const REMEMBER_DAYS  = 30

export default function LoginGate({ children, t }) {
  const [authed, setAuthed]     = useState(false)
  const [login, setLogin]       = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError]       = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [shake, setShake]       = useState(false)

  useEffect(() => {
    // Check session (tab still open)
    if (sessionStorage.getItem(SESSION_KEY) === 'ok') { setAuthed(true); return }
    // Check persistent remember-me token
    try {
      const raw = localStorage.getItem(REMEMBER_KEY)
      if (raw) {
        const { token, expires } = JSON.parse(raw)
        if (token === VALID_PASSWORD && Date.now() < expires) {
          sessionStorage.setItem(SESSION_KEY, 'ok')
          setAuthed(true)
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }
      }
    } catch { localStorage.removeItem(REMEMBER_KEY) }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (login === VALID_LOGIN && password === VALID_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({
          token: VALID_PASSWORD,
          expires: Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000,
        }))
      }
      setAuthed(true)
    } else {
      setError('Неверный логин или пароль')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  if (authed) return children

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}
        }
        .shake{animation:shake 0.45s ease}
      `}</style>

      <div className={shake ? 'shake' : ''} style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 20, padding: '40px 36px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, margin: 0 }}>
            <span style={{ color: 'var(--text)' }}>Recipe</span>
            <span style={{ color: '#22c55e' }}>Hub</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, fontFamily: 'DM Sans, sans-serif' }}>
            Наша книга рецептов
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={L}>Логин</label>
            <input className="input" type="text" value={login}
              onChange={e => { setLogin(e.target.value); setError('') }}
              placeholder="Введи логин..." autoComplete="username" autoFocus />
          </div>

          <div>
            <label style={L}>Пароль</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Введи пароль..."
                autoComplete="current-password"
                style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: 17, lineHeight: 1, padding: 4,
              }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text-2)',
            userSelect: 'none',
          }}>
            <div
              onClick={() => setRememberMe(p => !p)}
              style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${rememberMe ? '#22c55e' : 'var(--border)'}`,
                background: rememberMe ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {rememberMe && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>}
            </div>
            Запомнить меня на {REMEMBER_DAYS} дней
          </label>

          {error && (
            <div style={{
              padding: '9px 13px',
              background: 'rgba(200,60,30,0.08)', border: '1px solid rgba(200,60,30,0.2)',
              borderRadius: 8, color: '#c83c1e', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
            }}>🔒 {error}</div>
          )}

          <button type="submit" className="btn btn-primary"
            style={{ justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}>
            Войти →
          </button>
        </form>
      </div>
    </div>
  )
}

const L = {
  display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 500,
  color: 'var(--text-3)', letterSpacing: '0.03em', textTransform: 'uppercase',
  fontFamily: 'DM Sans, sans-serif',
}
