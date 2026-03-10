import { useState, useRef } from 'react'
import { X, Link2, PenLine, AlertCircle, Upload, Image } from 'lucide-react'
import { CATEGORIES } from '../i18n.js'
import { detectPlatform, PLATFORM_META, extractRecipeFromUrl, getYouTubeThumbnail, uploadImage } from '../lib/api.js'

export default function AddRecipeModal({ t, lang, onSave, onUpdate, onClose, initialData }) {
  const isEdit = Boolean(initialData)
  const [tab, setTab]       = useState(isEdit ? 'manual' : 'link')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]   = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const fileRef = useRef()

  const [url, setUrl]       = useState('')
  const [urlName, setUrlName] = useState('')

  const emptyForm = {
    title: '', title_en: '',
    description: '', description_en: '',
    source_url: '', thumbnail: '',
    time_minutes: '', servings: '', difficulty: 'easy',
    categories: [],
    ingredients: '', steps: '',
    platform: 'website', source_type: 'website', tags: '',
    calories: '', protein: '', fat: '', carbs: '',
  }

  const [form, setForm] = useState(() => {
    if (!initialData) return emptyForm
    return {
      title:          initialData.title || '',
      title_en:       initialData.title_en || '',
      description:    initialData.description || '',
      description_en: initialData.description_en || '',
      source_url:     initialData.source_url || '',
      thumbnail:      initialData.thumbnail || '',
      time_minutes:   initialData.time_minutes ? String(initialData.time_minutes) : '',
      servings:       initialData.servings || '',
      difficulty:     initialData.difficulty || 'easy',
      categories:     initialData.categories || [],
      ingredients:    (initialData.ingredients || []).join('\n'),
      steps:          (initialData.steps || []).join('\n'),
      platform:       initialData.platform || 'website',
      source_type:    initialData.source_type || 'website',
      tags:           (initialData.tags || []).join(', '),
      calories:       initialData.calories ? String(initialData.calories) : '',
      protein:        initialData.protein  ? String(initialData.protein)  : '',
      fat:            initialData.fat      ? String(initialData.fat)      : '',
      carbs:          initialData.carbs    ? String(initialData.carbs)    : '',
    }
  })

  const livePlatform = url ? detectPlatform(url) : null
  const liveMeta     = livePlatform ? PLATFORM_META[livePlatform] : null

  function setF(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function toggleCategory(key) {
    setForm(p => {
      const cats = p.categories.includes(key)
        ? p.categories.filter(c => c !== key)
        : [...p.categories, key]
      return { ...p, categories: cats }
    })
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Client-side size guard before compression (raw file > 20MB is too slow)
    if (file.size > 20 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 20MB)')
      return
    }
    setUploading(true)
    setError('')
    try {
      const { url: imgUrl } = await uploadImage(file)
      setF('thumbnail', imgUrl)
    } catch (err) {
      setError('Ошибка загрузки фото: ' + err.message)
    }
    setUploading(false)
  }

  async function handleExtract() {
    if (!url.trim()) return
    setLoading(true); setError('')
    setStatusMsg(liveMeta?.needsSearch ? `🔍 Ищу в ${liveMeta.label}...` : '🤖 Анализирую...')
    try {
      const data = await extractRecipeFromUrl(url.trim(), urlName.trim())
      const thumbnail = livePlatform === 'youtube' ? getYouTubeThumbnail(url.trim()) : null
      setForm({
        title:          urlName.trim() || data.title || '',
        title_en:       data.title_en || '',
        description:    data.description || '',
        description_en: data.description_en || '',
        source_url:     url.trim(),
        thumbnail:      thumbnail || data.thumbnail || '',
        time_minutes:   data.time_minutes ? String(data.time_minutes) : '',
        servings:       data.servings || '',
        difficulty:     data.difficulty || 'easy',
        categories:     data.categories || (data.category ? [data.category] : []),
        tags:           (data.tags || []).join(', '),
        ingredients:    (data.ingredients || []).join('\n'),
        steps:          (data.steps || []).join('\n'),
        platform:       data.platform || livePlatform || 'website',
        source_type:    data.source_type || 'website',
        calories:       data.calories ? String(data.calories) : '',
        protein:        data.protein  ? String(data.protein)  : '',
        fat:            data.fat      ? String(data.fat)      : '',
        carbs:          data.carbs    ? String(data.carbs)    : '',
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
        categories:     form.categories || [],
        tags:           form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        ingredients:    form.ingredients ? form.ingredients.split('\n').map(s => s.trim()).filter(Boolean) : [],
        steps:          form.steps ? form.steps.split('\n').map(s => s.trim()).filter(Boolean) : [],
        platform:       form.platform || 'website',
        source_type:    form.source_type || 'website',
        is_manual:      true,
        calories:       form.calories ? parseFloat(form.calories) : null,
        protein:        form.protein  ? parseFloat(form.protein)  : null,
        fat:            form.fat      ? parseFloat(form.fat)      : null,
        carbs:          form.carbs    ? parseFloat(form.carbs)    : null,
      }
      if (isEdit) await onUpdate(initialData.id, recipe)
      else await onSave(recipe)
      onClose()
    } catch { setError(t.errorSave) }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600 }}>
              {isEdit ? t.editRecipe : t.addModalTitle}
            </h2>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}><X size={20} /></button>
          </div>

          {!isEdit && (
            <div style={{
              display: 'flex', gap: 4,
              background: 'var(--bg-2)', borderRadius: 10, padding: 4, marginBottom: 20,
            }}>
              {[{ id: 'link', icon: <Link2 size={14}/>, label: t.tabLink },
                { id: 'manual', icon: <PenLine size={14}/>, label: t.tabManual }]
                .map(({ id, icon, label }) => (
                <button type="button" key={id} onClick={() => setTab(id)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '9px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500,
                  background: tab === id ? 'var(--bg-card)' : 'transparent',
                  color: tab === id ? 'var(--text)' : 'var(--text-3)',
                  boxShadow: tab === id ? 'var(--shadow)' : 'none', transition: 'all 0.15s',
                }}>{icon}{label}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>

          {/* ── Link tab ── */}
          {tab === 'link' && (
            <>
              {liveMeta && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)',
                }}>
                  <span style={{ fontSize: 16 }}>{liveMeta.icon}</span>
                  <span>{liveMeta.label}</span>
                </div>
              )}
              <div>
                <label style={L}>{t.urlLabel}</label>
                <input className="input" value={url} onChange={e => { setUrl(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleExtract()}
                  placeholder={t.urlPlaceholder} />
              </div>
              <div>
                <label style={L}>{t.nameLabel}</label>
                <input className="input" value={urlName} onChange={e => setUrlName(e.target.value)}
                  placeholder={t.namePlaceholder} />
              </div>
              <button type="button" className="btn btn-primary" onClick={handleExtract}
                disabled={loading || !url.trim()}
                style={{ justifyContent: 'center', padding: '13px', fontSize: 15, opacity: (!url.trim() || loading) ? 0.6 : 1 }}>
                {loading ? statusMsg || t.extracting : t.extractBtn}
              </button>
            </>
          )}

          {/* ── Manual / Edit tab ── */}
          {tab === 'manual' && (
            <>
              {/* Titles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={L}>{t.titleRu} *</label>
                  <input className="input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Паста карбонара" />
                </div>
                <div>
                  <label style={L}>{t.titleEn}</label>
                  <input className="input" value={form.title_en} onChange={e => setF('title_en', e.target.value)} placeholder="Pasta carbonara" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={L}>{t.descRu}</label>
                <textarea className="input" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Аппетитное описание..." style={{ minHeight: 60 }} />
              </div>

              {/* Photo */}
              <div>
                <label style={L}>{t.photoLabel}</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/gif" style={{ display: 'none' }} onChange={handleFileUpload} />
                  <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}
                    disabled={uploading} style={{ fontSize: 13, gap: 6, flexShrink: 0 }}>
                    <Upload size={14} /> {uploading ? 'Загружаю...' : t.photoUpload}
                  </button>
                  <input className="input" value={form.thumbnail} onChange={e => setF('thumbnail', e.target.value)}
                    placeholder={t.photoUrl} style={{ flex: 1, minWidth: 0 }} />
                </div>
                {form.thumbnail && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <img src={form.thumbnail} alt="" style={{ height: 80, borderRadius: 8, objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none' }} />
                    <button type="button" onClick={() => setF('thumbnail', '')} style={{
                      position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)',
                      border: 'none', borderRadius: '50%', color: 'white', width: 20, height: 20,
                      cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                  </div>
                )}
              </div>

              {/* Categories — checkbox list, max 5 */}
              <div>
                <label style={L}>
                  {t.categoryLabel}
                  <span style={{ marginLeft: 8, color: form.categories.length > 0 ? 'var(--accent)' : 'var(--text-3)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>
                    {form.categories.length}/5
                  </span>
                  {form.categories.length >= 5 && (
                    <span style={{ marginLeft: 6, color: '#c87c20', fontWeight: 600, textTransform: 'none', fontSize: 11 }}>
                      макс.
                    </span>
                  )}
                </label>
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 10,
                  overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
                }}>
                  {CATEGORIES.map(({ key, emoji }, idx) => {
                    const active = form.categories.includes(key)
                    const disabled = !active && form.categories.length >= 5
                    return (
                      <div
                        key={key}
                        onClick={() => { if (!disabled) toggleCategory(key) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          background: active ? 'var(--accent-light)' : 'transparent',
                          borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                          opacity: disabled ? 0.4 : 1,
                          transition: 'background 0.1s',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.background = 'var(--bg-2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--accent-light)' : 'transparent' }}
                      >
                        {/* Visual checkbox */}
                        <div style={{
                          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                          background: active ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}>
                          {active && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: 16 }}>{emoji}</span>
                        <span style={{
                          fontFamily: 'DM Sans, sans-serif', fontSize: 14,
                          color: active ? 'var(--accent)' : 'var(--text)',
                          fontWeight: active ? 600 : 400,
                        }}>
                          {t[`cat_${key}`]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Meta row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={L}>{t.timeLabel}</label>
                  <input className="input" value={form.time_minutes} onChange={e => setF('time_minutes', e.target.value)} placeholder="30" type="number" min="1" />
                </div>
                <div>
                  <label style={L}>{t.servingsLabel}</label>
                  <input className="input" value={form.servings} onChange={e => setF('servings', e.target.value)} placeholder="4" />
                </div>
                <div>
                  <label style={L}>{t.difficultyLabel}</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['easy','medium','hard'].map(d => (
                      <button type="button" key={d} onClick={() => setF('difficulty', d)} style={{
                        flex: 1, padding: '8px 4px',
                        border: `1.5px solid ${form.difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                        background: form.difficulty === d ? 'var(--accent-light)' : 'var(--bg-2)',
                        color: form.difficulty === d ? 'var(--accent)' : 'var(--text-2)',
                        borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: form.difficulty === d ? 600 : 400,
                      }}>
                        {d === 'easy' ? t.easy : d === 'medium' ? t.medium : t.hard}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition */}
              <div>
                <label style={L}>{t.nutritionLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { key: 'calories', label: t.caloriesLabel, placeholder: '250' },
                    { key: 'protein',  label: t.proteinLabel,  placeholder: '12' },
                    { key: 'fat',      label: t.fatLabel,       placeholder: '8' },
                    { key: 'carbs',    label: t.carbsLabel,     placeholder: '30' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label style={{ ...L, fontSize: 10 }}>{label}</label>
                      <input className="input" value={form[key]} onChange={e => setF(key, e.target.value)}
                        placeholder={placeholder} type="number" min="0" style={{ textAlign: 'center' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Ingredients & Steps */}
              <div>
                <label style={L}>{t.ingredientsLabel}</label>
                <textarea className="input" value={form.ingredients} onChange={e => setF('ingredients', e.target.value)}
                  placeholder={t.ingredientsPlaceholder} style={{ minHeight: 90 }} />
              </div>
              <div>
                <label style={L}>{t.stepsLabel}</label>
                <textarea className="input" value={form.steps} onChange={e => setF('steps', e.target.value)}
                  placeholder={t.stepsPlaceholder} style={{ minHeight: 90 }} />
              </div>

              {/* Source URL */}
              <div>
                <label style={L}>{t.sourceUrlLabel}</label>
                <input className="input" value={form.source_url} onChange={e => setF('source_url', e.target.value)}
                  placeholder="https://..." />
              </div>

              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={loading}
                style={{ justifyContent: 'center', padding: '13px', fontSize: 15, opacity: loading ? 0.6 : 1 }}>
                {loading ? '...' : isEdit ? t.saveChanges : t.saveBtn}
              </button>
            </>
          )}

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

const L = {
  display: 'block', marginBottom: 5,
  fontSize: 11, fontWeight: 500,
  color: 'var(--text-3)', letterSpacing: '0.03em',
  textTransform: 'uppercase',
}
