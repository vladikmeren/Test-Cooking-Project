import { useState, useEffect, useCallback } from 'react'
import { Copy, Share2, Plus, X, Check, ChevronDown, ChevronUp, ShoppingCart, Trash2 } from 'lucide-react'
import { fetchMealPlans, aggregateIngredients, SHOP_CATEGORIES } from '../lib/api.js'

const PRESETS = [
  { label: '1 день',    days: 1  },
  { label: '3 дня',     days: 3  },
  { label: '1 неделя',  days: 7  },
  { label: '2 недели',  days: 14 },
]

function toDateStr(d) { return d.toISOString().split('T')[0] }
function addDays(d, n) { const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt }

function fmtQty(qty, unit) {
  if (qty === null) return ''
  const q = qty % 1 === 0 ? qty : qty.toFixed(1)
  return unit ? `${q} ${unit}` : `${q}`
}

export default function ShoppingList({ recipes, lang }) {
  const [days,       setDays]     = useState(7)
  const [startDate,  setStart]    = useState(() => toDateStr(new Date()))
  const [grouped,    setGrouped]  = useState({})
  const [checked,    setChecked]  = useState({}) // key → bool
  const [collapsed,  setCollapsed] = useState({})
  const [custom,     setCustom]   = useState([]) // [{id, name, checked}]
  const [newItem,    setNewItem]  = useState('')
  const [loading,    setLoading]  = useState(false)
  const [copied,     setCopied]   = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [planInfo,   setPlanInfo] = useState({ meals: 0, recipes: 0 })

  const endDate = toDateStr(addDays(new Date(startDate), days - 1))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const plans = await fetchMealPlans(startDate, endDate)
      // Collect all recipe ids
      const allIds = [...new Set(plans.flatMap(p => p.recipe_ids || []))]
      const usedRecipes = recipes.filter(r => allIds.includes(r.id))

      // Aggregate ingredients
      const ingredientLists = usedRecipes.map(r => r.ingredients || [])
      const agg = aggregateIngredients(ingredientLists)

      setGrouped(agg)
      setChecked({})
      setPlanInfo({ meals: plans.filter(p => (p.recipe_ids||[]).length > 0).length, recipes: usedRecipes.length })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [startDate, endDate, recipes])

  useEffect(() => { load() }, [load])

  function toggleCheck(key) {
    setChecked(c => ({ ...c, [key]: !c[key] }))
  }

  function toggleCollapse(cat) {
    setCollapsed(c => ({ ...c, [cat]: !c[cat] }))
  }

  function addCustom() {
    if (!newItem.trim()) return
    setCustom(c => [...c, { id: Date.now(), name: newItem.trim(), checked: false }])
    setNewItem('')
  }

  function toggleCustom(id) {
    setCustom(c => c.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function removeCustom(id) {
    setCustom(c => c.filter(i => i.id !== id))
  }

  function clearChecked() {
    setChecked({})
    setCustom(c => c.map(i => ({ ...i, checked: false })))
  }

  function clearAll() {
    setChecked({})
    setCustom([])
    setGrouped({})
    setPlanInfo({ meals: 0, recipes: 0 })
    setConfirmClear(false)
  }

  function clearCategory(catKey, items) {
    setChecked(c => {
      const next = { ...c }
      items.forEach(item => { delete next[`${item.name}|${item.unit}`] })
      return next
    })
  }

  // Build text for copy/share
  function buildText() {
    const lines = [`🛒 Список покупок (${startDate} — ${endDate})\n`]
    for (const catMeta of SHOP_CATEGORIES) {
      const items = grouped[catMeta.key] || []
      if (!items.length) continue
      lines.push(`\n${catMeta.label}`)
      for (const item of items) {
        const key = `${item.name}|${item.unit}`
        const done = checked[key] ? '✓ ' : '• '
        const qty = fmtQty(item.qty, item.unit)
        lines.push(`  ${done}${qty ? qty + ' ' : ''}${item.name}`)
      }
    }
    if (custom.length) {
      lines.push('\n🔖 Добавлено вручную')
      custom.forEach(i => lines.push(`  ${i.checked ? '✓' : '•'} ${i.name}`))
    }
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildText())
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    const text = buildText()
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(url, '_blank')
    }
  }

  const totalItems = Object.values(grouped).reduce((s, arr) => s + arr.length, 0) + custom.length
  const checkedCount = Object.values(checked).filter(Boolean).length + custom.filter(i => i.checked).length

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>🛒 Список покупок</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Автоматически из планов питания</p>
      </div>

      {/* Period selector */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: 'var(--text-2)' }}>Период</div>
        {/* Presets */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              style={{
                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: `1.5px solid ${days === p.days ? 'var(--accent)' : 'var(--border)'}`,
                background: days === p.days ? 'var(--accent-light)' : 'var(--bg-2)',
                color: days === p.days ? 'var(--accent)' : 'var(--text-2)',
              }}
            >{p.label}</button>
          ))}
          <button
            type="button"
            onClick={() => setDays(d => d)} // custom — show input
            style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: `1.5px solid var(--border)`, background: 'var(--bg-2)', color: 'var(--text-3)',
            }}
          >Свой период</button>
        </div>
        {/* Date + range */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>С даты</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => setStart(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 13, paddingTop: 18 }}>→</div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>По дату</label>
            <div className="input" style={{ fontSize: 14, color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>{endDate}</div>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, display: 'block' }}>Дней</label>
            <input
              type="number"
              className="input"
              min={1} max={60}
              value={days}
              onChange={e => setDays(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      {planInfo.recipes > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'приёмов пищи', value: planInfo.meals, color: 'var(--accent)' },
            { label: 'рецептов', value: planInfo.recipes, color: 'var(--accent-2)' },
            { label: 'ингредиентов', value: totalItems, color: 'var(--accent-3)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', textAlign: 'center', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)' }} />)}
        </div>
      )}

      {!loading && totalItems === 0 && planInfo.recipes === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, marginBottom: 8 }}>Нет запланированных рецептов</div>
          <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Сначала добавь блюда в Календарь за этот период</div>
        </div>
      )}

      {!loading && totalItems > 0 && (
        <>
          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 14, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
              {checkedCount > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>✓ {checkedCount}</span>}
              {checkedCount > 0 && ' / '}{totalItems} позиций
              {checkedCount > 0 && (
                <button type="button"
                  onClick={clearChecked}
                  title="Снять все галочки"
                  style={{ marginLeft: 4, padding: '3px 9px', fontSize: 11, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
                >
                  <X size={11}/> Снять галочки
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={handleCopy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={handleShare}>
                <Share2 size={15} /> Поделиться
              </button>
              {!confirmClear ? (
                <button type="button"
                  onClick={() => setConfirmClear(true)}
                  style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Trash2 size={14}/> Очистить всё
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Уверен?</span>
                  <button type="button"
                    onClick={clearAll}
                    style={{ padding: '7px 12px', fontSize: 12, fontWeight: 700, background: '#ef4444', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Trash2 size={13}/> Да, очистить
                  </button>
                  <button type="button"
                    onClick={() => setConfirmClear(false)}
                    style={{ padding: '7px 10px', fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)' }}
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grouped items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SHOP_CATEGORIES.map(cat => {
              const items = grouped[cat.key] || []
              if (!items.length) return null
              const isCollapsed = collapsed[cat.key]
              const doneInCat   = items.filter(i => checked[`${i.name}|${i.unit}`]).length
              return (
                <div key={cat.key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(cat.key)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{cat.label.split(' ')[0]}</span>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{cat.label.split(' ').slice(1).join(' ')}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-2)', borderRadius: 99, padding: '1px 8px' }}>
                          {doneInCat > 0 ? `${doneInCat}/` : ''}{items.length}
                        </span>
                      </div>
                      {isCollapsed ? <ChevronDown size={16} color="var(--text-3)" /> : <ChevronUp size={16} color="var(--text-3)" />}
                    </button>
                    {doneInCat > 0 && (
                      <button type="button"
                        onClick={e => { e.stopPropagation(); clearCategory(cat.key, items) }}
                        title="Снять галочки в этой категории"
                        style={{ padding: '6px 12px', marginRight: 10, fontSize: 11, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
                      >
                        <X size={10}/> Снять
                      </button>
                    )}
                  </div>
                  {!isCollapsed && items.map(item => {
                    const key   = `${item.name}|${item.unit}`
                    const done  = !!checked[key]
                    return (
                      <div key={key} className={`shop-item ${done ? 'checked' : ''}`} onClick={() => toggleCheck(key)} style={{ cursor: 'pointer' }}>
                        {/* Checkbox */}
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                          background: done ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}>
                          {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span className="shop-name" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{item.name}</span>
                        </div>
                        {item.qty !== null && (
                          <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {fmtQty(item.qty, item.unit)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Custom items */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
              <div style={{ padding: '14px 18px', borderBottom: custom.length > 0 ? '1px solid var(--border)' : 'none', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✏️</span> Добавлено вручную
                {custom.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-2)', borderRadius: 99, padding: '1px 8px' }}>{custom.length}</span>}
              </div>
              {custom.map(item => (
                <div key={item.id} className={`shop-item ${item.checked ? 'checked' : ''}`}>
                  <div
                    onClick={() => toggleCustom(item.id)}
                    style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: 'pointer', border: `2px solid ${item.checked ? 'var(--accent)' : 'var(--border)'}`, background: item.checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
                  >
                    {item.checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="shop-name" style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)', cursor: 'pointer' }} onClick={() => toggleCustom(item.id)}>{item.name}</span>
                  <button type="button" onClick={() => removeCustom(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              {/* Add custom */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: 1, fontSize: 14, padding: '9px 12px' }}
                  placeholder="Добавить продукт..."
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                />
                <button type="button" className="btn btn-primary" style={{ padding: '9px 14px', flexShrink: 0 }} onClick={addCustom}>
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
