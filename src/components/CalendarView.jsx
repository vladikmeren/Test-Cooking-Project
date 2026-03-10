import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Clock, Search } from 'lucide-react'
import { fetchMealPlans, upsertMealPlan, deleteMealPlan } from '../lib/api.js'

const MEALS = [
  { key: 'breakfast', emoji: '🌅', label: 'Завтрак',  labelEn: 'Breakfast', color: '#f59e0b' },
  { key: 'lunch',     emoji: '☀️', label: 'Обед',     labelEn: 'Lunch',     color: '#16a34a' },
  { key: 'dinner',    emoji: '🌙', label: 'Ужин',     labelEn: 'Dinner',    color: '#7c3aed' },
  { key: 'snack',     emoji: '🍎', label: 'Перекус',  labelEn: 'Snack',     color: '#ea580c' },
]

const DAY_NAMES   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function getMonday(d) {
  const dt = new Date(d)
  const day = dt.getDay() || 7
  dt.setDate(dt.getDate() - day + 1)
  dt.setHours(0,0,0,0)
  return dt
}

function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function isToday(d) {
  return toDateStr(d) === toDateStr(new Date())
}

function isPast(d) {
  const today = new Date(); today.setHours(0,0,0,0)
  return d < today
}

// Pick recipe from list modal
function RecipePickerModal({ recipes, lang, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = recipes.filter(r =>
    (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.title_en || '').toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700 }}>Выбрать рецепт</div>
          <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 36, fontSize: 14 }}
              placeholder="Найти рецепт..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>Рецептов не найдено</div>
          )}
          {filtered.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--border)', textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {r.thumbnail ? (
                <img src={r.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🍽</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lang === 'en' && r.title_en ? r.title_en : r.title}
                </div>
                {r.time_minutes && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Clock size={11} /> {r.time_minutes} мин
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CalendarView({ recipes, lang, t }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [plans, setPlans]         = useState({}) // key: "date|meal" → {recipe_ids, custom_note}
  const [loading, setLoading]     = useState(false)
  const [picker, setPicker]       = useState(null) // {date, meal} when open
  const [view, setView]           = useState('current') // 'current' | 'history'
  const [expandedDay, setExpandedDay] = useState(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const fromStr  = toDateStr(weekDays[0])
  const toStr    = toDateStr(weekDays[6])

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchMealPlans(fromStr, toStr)
      const map  = {}
      for (const row of rows) {
        map[`${row.plan_date}|${row.meal_type}`] = row
      }
      setPlans(map)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [fromStr, toStr])

  useEffect(() => { loadPlans() }, [loadPlans])

  function getSlot(date, meal) {
    return plans[`${date}|${meal}`] || { recipe_ids: [], custom_note: '' }
  }

  function recipeById(id) {
    return recipes.find(r => r.id === id)
  }

  async function handleAddRecipe(date, meal, recipe) {
    const slot    = getSlot(date, meal)
    const newIds  = [...(slot.recipe_ids || []).filter(id => id !== recipe.id), recipe.id]
    const updated = await upsertMealPlan(date, meal, newIds, slot.custom_note || '')
    setPlans(p => ({ ...p, [`${date}|${meal}`]: updated }))
    setPicker(null)
  }

  async function handleRemoveRecipe(date, meal, recipeId) {
    const slot   = getSlot(date, meal)
    const newIds = (slot.recipe_ids || []).filter(id => id !== recipeId)
    if (newIds.length === 0 && !slot.custom_note) {
      await deleteMealPlan(date, meal)
      setPlans(p => { const np = { ...p }; delete np[`${date}|${meal}`]; return np })
    } else {
      const updated = await upsertMealPlan(date, meal, newIds, slot.custom_note || '')
      setPlans(p => ({ ...p, [`${date}|${meal}`]: updated }))
    }
  }

  // Month/year label for header
  const startMonth = MONTH_NAMES[weekDays[0].getMonth()]
  const endMonth   = MONTH_NAMES[weekDays[6].getMonth()]
  const yearLabel  = weekDays[0].getFullYear()
  const monthLabel = startMonth === endMonth ? `${startMonth} ${yearLabel}` : `${startMonth}–${endMonth} ${yearLabel}`

  // Count total planned meals this week
  const totalPlanned = Object.values(plans).reduce((sum, slot) => sum + (slot.recipe_ids?.length || 0), 0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 80px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>🗓 Меню на неделю</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 2 }}>
            {monthLabel} {totalPlanned > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>· {totalPlanned} блюд запланировано</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}
            onClick={() => setWeekStart(getMonday(new Date()))}>
            Сегодня
          </button>
          <button type="button" className="btn btn-ghost" style={{ padding: '8px' }}
            onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', minWidth: 130, textAlign: 'center' }}>{monthLabel}</span>
          <button type="button" className="btn btn-ghost" style={{ padding: '8px' }}
            onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {MEALS.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
            {m.emoji} {m.label}
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {weekDays.map(d => (
            <div key={d} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Mobile: collapsible days */}
          <div className="cal-mobile" style={{ display: 'none' }}>
            <style>{`.cal-mobile{display:none!important}@media(max-width:700px){.cal-mobile{display:block!important}.cal-desktop{display:none!important}}`}</style>
            {weekDays.map(day => {
              const dateStr = toDateStr(day)
              const past    = isPast(day)
              const today   = isToday(day)
              const isOpen  = expandedDay === dateStr
              const slotCount = MEALS.reduce((n, m) => n + (getSlot(dateStr, m.key).recipe_ids?.length || 0), 0)
              return (
                <div key={dateStr} className={`cal-day ${today ? 'today' : ''}`} style={{ marginBottom: 8, opacity: past && !today ? 0.7 : 1 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedDay(isOpen ? null : dateStr)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: today ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>{day.getDate()}</div>
                      </div>
                      {slotCount > 0 && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{slotCount} блюд</span>}
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-3)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {MEALS.map(meal => <MealSlot key={meal.key} meal={meal} date={dateStr} slot={getSlot(dateStr, meal.key)} recipeById={recipeById} lang={lang} onAdd={() => setPicker({ date: dateStr, meal: meal.key })} onRemove={(rid) => handleRemoveRecipe(dateStr, meal.key, rid)} past={past} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop: 7-column grid */}
          <div className="cal-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {weekDays.map(day => {
              const dateStr = toDateStr(day)
              const past    = isPast(day)
              const today   = isToday(day)
              return (
                <div key={dateStr} className={`cal-day ${today ? 'today' : ''}`} style={{ opacity: past && !today ? 0.72 : 1 }}>
                  {/* Day header */}
                  <div style={{
                    padding: '10px 12px 8px',
                    background: today ? 'linear-gradient(135deg, var(--accent-light), transparent)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{DAY_NAMES[day.getDay() === 0 ? 6 : day.getDay() - 1]}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: today ? 'var(--accent)' : 'var(--text)', lineHeight: 1.1 }}>{day.getDate()}</div>
                    {today && <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>Сегодня</div>}
                  </div>
                  {MEALS.map(meal => (
                    <MealSlot key={meal.key} meal={meal} date={dateStr} slot={getSlot(dateStr, meal.key)} recipeById={recipeById} lang={lang} onAdd={() => setPicker({ date: dateStr, meal: meal.key })} onRemove={(rid) => handleRemoveRecipe(dateStr, meal.key, rid)} past={past} />
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Recipe picker modal */}
      {picker && (
        <RecipePickerModal
          recipes={recipes}
          lang={lang}
          onSelect={r => handleAddRecipe(picker.date, picker.meal, r)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

function MealSlot({ meal, date, slot, recipeById, lang, onAdd, onRemove, past }) {
  const ids = slot.recipe_ids || []
  return (
    <div className="cal-meal-slot" style={{ padding: '8px 10px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ids.length > 0 ? 6 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: meal.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {meal.emoji} {meal.label}
        </span>
        <button
          type="button"
          onClick={onAdd}
          style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title="Добавить рецепт"
        >
          <Plus size={11} color="var(--text-3)" />
        </button>
      </div>
      {ids.map(id => {
        const r = recipeById(id)
        if (!r) return null
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, background: 'var(--bg-2)', borderRadius: 7, padding: '4px 6px' }}>
            {r.thumbnail && <img src={r.thumbnail} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
            <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lang === 'en' && r.title_en ? r.title_en : r.title}>
              {lang === 'en' && r.title_en ? r.title_en : r.title}
            </span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, flexShrink: 0, color: 'var(--text-3)', display: 'flex' }}
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
