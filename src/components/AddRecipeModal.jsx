import { useState } from 'react'
import { X, Link2, PenLine, AlertCircle } from 'lucide-react'
import { CATEGORIES } from '../i18n.js'
import { detectPlatform, PLATFORM_META, extractRecipeFromUrl, getYouTubeThumbnail } from '../lib/api.js'

export default function AddRecipeModal({ t, lang, onSave, onClose }) {
  const [tab, setTab]       = useState('link') // 'link' | 'manual'
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [statusMsg, setStatusMsg] = useState('')

  // Link tab
  const [url, setUrl]       = useState('')
  const [urlName, setUrlName] = useState('')

  // Manual tab + prefilled after extraction
  const [form, setForm] = useState({
    title: '', title_en: '',
    description: '', description_en: '',
    source_url: '', thumbnail: '',
    time_minutes: '', servings: '', difficulty: 'easy', category: '',
    ingredients: '', steps: '',
    platform: 'website', source_type: 'website', tags: '',
  })

  const livePlatform = url ? detectPlatform(url) : null
  const liveMeta     = livePlatform ? PLATFORM_META[livePlatform] : null
  const warnName     = liveMeta?.needsSearch && !urlName.trim()

  function setF(key, val) { setForm(p => ({ ...p, [key]: val })) }

  async function handleExtract() {
    if (!url.trim()) return
    setLoading(true); setError(''); setStatusMsg(
      liveMeta?.needsSearch ? `🔍 Ищу в ${liveMeta.label}...` : '🤖 Анализирую...'
    )
    try {
      const data = await extractRecipeFromUrl(url.trim(), urlName.trim())
      const thumbnail = livePlatform === 'youtube' ? getYouTubeThumbnail(url.trim()) : null
      setForm({
        title:          urlName.trim() || data.title || '',
        title_en:       data.title_en || '',
        description:    data.description || '',
        description_en: data.description_en || '',
        source_url:     url.trim(),
        thumbnail:      thumbnail || '',
        time_minutes:   data.time_minutes ? String(data.time_minutes) : '',
        servings:       data.servings || '',
        difficulty:     data.difficulty || 'easy',
        category:       data.category || '',
        tags:           (data.tags || []).join(', '),
        ingredients:    (data.ingredients || []).join('\n'),
        steps:          (data.steps || []).join('\n'),
        platform:       data.platform || livePlatform || 'website',
        source_type:    data.source_type || 'website',
      })
      setTab('manual')
    } catch (e) {
      setError(t.errorExtract)
    }
    setLoading(false); setStatusMsg('')
  }

  async function handleSave() {
    if (!form.title.trim()) { setError(t.requiredField + ': ' + t.titleRu); return }
    setLoading(true); setError('')
    try {
      const recipe = {
        title:          form.title.trim(),
        title_en:       form.title_en.trim() || null,
        description:    form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        source_url:     form.source_url.trim() || null,
        thumbnail:      form.thumbnail.trim() || null,
        time_minutes:   form.time_minutes ? parseInt(form.time_minutes) : null,
        servings:       form.servings.trim() || null,
        difficulty:     form.difficulty || null,
        category:       form.category || null,
        tags:           form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        ingredients:    form.ingredients ? form.ingredients.split('\n').map(s => s.trim()).filter(Boolean) : [],
        steps:          form.steps ? form.steps.split('\n').map(s => s.trim()).filter(Boolean) : [],
        platform:       form.platform || 'website',
        source_type:    form.source_type || 'website',
        is_manual:      tab === 'manual' && !form.source_url,
      }
      await onSave(recipe)
      onClose()
    } catch {
      setError(t.errorSave)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '28px 28px 0' }}>
          {/* Modal header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600 }}>
              {t.addModalTitle}
            </h2>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}><X size={20} /></button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 4,
            background: 'var(--bg-2)', borderRadius: 10,
            padding: 4, marginBottom: 24,
          }}>
            {[
              { id: 'link',   icon: <Link2 size={14} />,   label: t.tabLink   },
              { id: 'manual', icon: <PenLine size={14} />, label: t.tabManual },
            ].map(({ id, icon, label }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 14px',
                borderRadius: 7, border: 'none', cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500,
                background: tab === id ? 'var(--bg-card)' : 'transparent',
                color: tab === id ? 'var(--text)' : 'var(--text-3)',
                boxShadow: tab === id ? 'var(--shadow)' : 'none',
                transition: 'all 0.15s',
              }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Link tab ── */}
          {tab === 'link' && (
            <>
              {liveMeta && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--bg-2)',
                  border: `1px solid ${warnName ? 'var(--accent-2)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, color: 'var(--text-2)',
                }}>
                  <span style={{ fontSize: 16 }}>{liveMeta.icon}</span>
                  <span>
                    {liveMeta.label || ''}
                    {warnName && <span style={{ color: 'var(--accent-2)' }}> — рекомендуем указать название</span>}
                  </span>
                </div>
              )}
              <div>
                <label style={labelStyle}>{t.urlLabel}</label>
                <input className="input" value={url} onChange={e => { setUrl(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleExtract()}
                  placeholder={t.urlPlaceholder}
                />
              </div>
              <div>
                <label style={labelStyle}>{t.nameLabel}</label>
                <input className="input" value={urlName} onChange={e => setUrlName(e.target.value)}
                  placeholder={t.namePlaceholder}
                />
              </div>
              <button className="btn btn-primary" onClick={handleExtract}
                disabled={loading || !url.trim()}
                style={{ justifyContent: 'center', padding: '13px', fontSize: 15, opacity: (!url.trim() || loading) ? 0.6 : 1 }}
              >
                {loading ? statusMsg || t.extracting : t.extractBtn}
              </button>
            </>
          )}

          {/* ── Manual / edit tab ── */}
          {tab === 'manual' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t.titleRu} *</label>
                  <input className="input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Паста карбонара" />
                </div>
                <div>
                  <label style={labelStyle}>{t.titleEn}</label>
                  <input className="input" value={form.title_en} onChange={e => setF('title_en', e.target.value)} placeholder="Pasta carbonara" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t.descRu}</label>
                <textarea className="input" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Аппетитное описание..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t.categoryLabel}</label>
                  <select className="input" value={form.category} onChange={e => setF('category', e.target.value)}
                    style={{ appearance: 'none', cursor: 'pointer' }}>
                    <option value="">—</option>
                    {CATEGORIES.map(({ key, emoji }) => (
                      <option key={key} value={key}>{emoji} {t[`cat_${key}`]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t.timeLabel}</label>
                  <input className="input" value={form.time_minutes} onChange={e => setF('time_minutes', e.target.value)} placeholder="30" type="number" min="1" />
                </div>
                <div>
                  <label style={labelStyle}>{t.servingsLabel}</label>
                  <input className="input" value={form.servings} onChange={e => setF('servings', e.target.value)} placeholder="4" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t.difficultyLabel}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setF('difficulty', d)} style={{
                      flex: 1, padding: '9px 6px', border: `1.5px solid ${form.difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.difficulty === d ? 'var(--accent-light)' : 'var(--bg-2)',
                      color: form.difficulty === d ? 'var(--accent)' : 'var(--text-2)',
                      borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: form.difficulty === d ? 600 : 400,
                    }}>
                      {d === 'easy' ? t.easy : d === 'medium' ? t.medium : t.hard}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t.ingredientsLabel}</label>
                <textarea className="input" value={form.ingredients} onChange={e => setF('ingredients', e.target.value)}
                  placeholder={t.ingredientsPlaceholder} style={{ minHeight: 100 }} />
              </div>

              <div>
                <label style={labelStyle}>{t.stepsLabel}</label>
                <textarea className="input" value={form.steps} onChange={e => setF('steps', e.target.value)}
                  placeholder={t.stepsPlaceholder} style={{ minHeight: 100 }} />
              </div>

              {form.source_url && (
                <div>
                  <label style={labelStyle}>Source URL</label>
                  <input className="input" value={form.source_url} onChange={e => setF('source_url', e.target.value)} />
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSave}
                disabled={loading}
                style={{ justifyContent: 'center', padding: '13px', fontSize: 15, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '...' : t.saveBtn}
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(200,60,30,0.08)', border: '1px solid rgba(200,60,30,0.2)',
              color: '#c83c1e', fontSize: 13,
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', marginBottom: 5,
  fontSize: 12, fontWeight: 500,
  color: 'var(--text-3)', letterSpacing: '0.03em',
  textTransform: 'uppercase',
}
