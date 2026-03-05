import { useState, useEffect } from 'react'

// Credentials — hardcoded, client-side gate
const VALID_LOGIN    = 'Biba&Boba'
const VALID_PASSWORD = 'LolKek123321'
const SESSION_KEY    = 'tb_auth_v1'

export default function LoginGate({ children }) {
  const [authed, setAuthed]   = useState(false)
  const [login, setLogin]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [shake, setShake]     = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'ok') setAuthed(true)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (login === VALID_LOGIN && password === VALID_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
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
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
        .shake { animation: shake 0.45s ease; }
      `}</style>

      <div
        className={shake ? 'shake' : ''}
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '40px 36px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 28, fontWeight: 600,
            color: 'var(--accent)',
            margin: 0,
          }}>TasteBook</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, fontFamily: 'DM Sans, sans-serif' }}>
            Наша книга рецептов
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Логин</label>
            <input
              className="input"
              type="text"
              value={login}
              onChange={e => { setLogin(e.target.value); setError('') }}
              placeholder="Введи логин..."
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Пароль</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Введи пароль..."
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-3)', fontSize: 17, lineHeight: 1,
                  padding: 4,
                }}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '9px 13px',
              background: 'rgba(200,60,30,0.08)',
              border: '1px solid rgba(200,60,30,0.2)',
              borderRadius: 8,
              color: '#c83c1e',
              fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
            }}>
              🔒 {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}
          >
            Войти →
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', marginBottom: 5,
  fontSize: 12, fontWeight: 500,
  color: 'var(--text-3)', letterSpacing: '0.03em',
  textTransform: 'uppercase',
  fontFamily: 'DM Sans, sans-serif',
}
