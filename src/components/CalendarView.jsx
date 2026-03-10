import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Clock, Search, Calendar } from 'lucide-react'
import { fetchMealPlans, upsertMealPlan, deleteMealPlan } from '../lib/api.js'

const MEALS = [
  { key: 'breakfast', emoji: '🌅', label: 'Завтрак', color: '#d97706', dot: '🌅' },
  { key: 'lunch',     emoji: '☀️', label: 'Обед',    color: '#16a34a', dot: '☀️' },
  { key: 'dinner',    emoji: '🌙', label: 'Ужин',    color: '#7c3aed', dot: '🌙' },
  { key: 'snack',     emoji: '🍎', label: 'Перекус', color: '#ea580c', dot: '🍎' },
]

const DAY_SHORT  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const MONTH_RU   = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTH_GEN  = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toDateStr(d)  { return d.toISOString().split('T')[0] }
function isToday(d)    { return toDateStr(d) === toDateStr(new Date()) }
function isPast(d)     { const t=new Date(); t.setHours(0,0,0,0); return d<t }
function dayOfWeek(d)  { return d.getDay()===0?6:d.getDay()-1 }

function getMonthDays(year, month) {
  // Returns all days in month + leading/trailing empty slots for Mon-start grid
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month+1, 0)
  const leadBlanks = dayOfWeek(firstDay) // Mon=0
  const days = []
  for (let i = 0; i < leadBlanks; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  // Pad to complete last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

// ── Recipe Picker ─────────────────────────────────────────────────────────
function RecipePicker({ recipes, lang, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef  = useRef()
  const list = recipes.filter(r =>
    (r.title||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.title_en||'').toLowerCase().includes(q.toLowerCase())
  )
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'Playfair Display,serif', fontSize:18, fontWeight:700 }}>Выбрать рецепт</span>
          <button type="button" className="btn btn-ghost" style={{padding:6}} onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }}/>
            <input ref={inputRef} className="input"
              style={{ paddingLeft:34, fontSize:14 }}
              placeholder="Найти рецепт..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
        <div style={{ maxHeight:420, overflowY:'auto' }}>
          {list.length === 0 && <div style={{padding:'32px 20px', textAlign:'center', color:'var(--text-3)', fontSize:14}}>Нет рецептов</div>}
          {list.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onSelect(r) }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 18px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--border)', textAlign:'left', transition:'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}
            >
              {r.thumbnail
                ? <img src={r.thumbnail} alt="" style={{ width:44,height:44,borderRadius:9,objectFit:'cover',flexShrink:0 }}/>
                : <div style={{ width:44,height:44,borderRadius:9,background:'var(--bg-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22 }}>🍽</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {lang==='en'&&r.title_en ? r.title_en : r.title}
                </div>
                {r.time_minutes && (
                  <div style={{fontSize:12,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3,marginTop:2}}>
                    <Clock size={11}/> {r.time_minutes} мин
                  </div>
                )}
              </div>
              <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600, flexShrink:0 }}>+ Добавить</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Day Card (expanded view) ──────────────────────────────────────────────
function DayCard({ day, plans, recipeById, lang, onAddClick, onRemove }) {
  const dateStr = toDateStr(day)
  const today   = isToday(day)
  const past    = isPast(day)

  // Count filled slots for indicator dots
  const filledMeals = MEALS.filter(m => (plans[`${dateStr}|${m.key}`]?.recipe_ids?.length || 0) > 0)

  return (
    <div style={{
      borderRadius: 14,
      border: today ? '2px solid var(--accent)' : '1px solid var(--border)',
      background: 'var(--bg-card)',
      overflow: 'hidden',
      opacity: past && !today ? 0.70 : 1,
      boxShadow: today ? '0 0 0 3px var(--accent-light), var(--shadow)' : 'var(--shadow-xs)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Day header */}
      <div style={{
        padding: '10px 12px 8px',
        background: today ? 'var(--accent-light)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: today?'var(--accent)':'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', lineHeight:1 }}>{DAY_SHORT[dayOfWeek(day)]}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: today?'var(--accent)':'var(--text)', lineHeight:1.05, letterSpacing:'-0.02em' }}>{day.getDate()}</div>
          {today && <div style={{ fontSize:9, fontWeight:700, color:'var(--accent)', marginTop:1, letterSpacing:'0.05em' }}>СЕГОДНЯ</div>}
        </div>
        {/* Emoji dots for filled meals */}
        {filledMeals.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:1, justifyContent:'flex-end', maxWidth:44 }}>
            {filledMeals.map(m => (
              <span key={m.key} style={{ fontSize:13, lineHeight:1 }} title={m.label}>{m.emoji}</span>
            ))}
          </div>
        )}
      </div>

      {/* Meal slots */}
      <div style={{ flex:1 }}>
        {MEALS.map(meal => {
          const slot = plans[`${dateStr}|${meal.key}`] || { recipe_ids: [] }
          const ids  = slot.recipe_ids || []
          const hasDishes = ids.length > 0

          return (
            <div key={meal.key} style={{
              padding: hasDishes ? '6px 10px 8px' : '5px 10px',
              borderBottom: '1px solid var(--border)',
              background: hasDishes ? `${meal.color}08` : 'transparent',
            }}>
              {/* Meal label + add button */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: hasDishes ? 6 : 0 }}>
                <span style={{ fontSize:10, fontWeight:700, color:meal.color, textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{fontSize:12}}>{meal.emoji}</span>{meal.label}
                  {hasDishes && <span style={{fontSize:9,fontWeight:600,background:meal.color,color:'#fff',borderRadius:99,padding:'1px 5px',marginLeft:3}}>{ids.length}</span>}
                </span>
                <button type="button"
                  onClick={() => onAddClick(dateStr, meal.key)}
                  style={{ width:20, height:20, borderRadius:6, background: hasDishes ? meal.color+'22' : 'var(--bg-2)', border:`1px solid ${hasDishes ? meal.color+'44' : 'var(--border)'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-light)';e.currentTarget.style.borderColor='var(--accent)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background=hasDishes?meal.color+'22':'var(--bg-2)';e.currentTarget.style.borderColor=hasDishes?meal.color+'44':'var(--border)'}}
                >
                  <Plus size={11} color={hasDishes ? meal.color : 'var(--text-3)'}/>
                </button>
              </div>

              {/* Recipe cards — always visible */}
              {ids.map(id => {
                const r = recipeById(id)
                if (!r) return null
                const name = (lang==='en'&&r.title_en) ? r.title_en : r.title
                return (
                  <div key={id} style={{
                    display:'flex', alignItems:'center', gap:6, marginBottom:4,
                    background:'var(--bg-card)', borderRadius:8, padding:'5px 7px',
                    border:`1px solid ${meal.color}33`,
                    boxShadow:`0 1px 3px ${meal.color}15`,
                  }}>
                    {r.thumbnail
                      ? <img src={r.thumbnail} alt="" style={{width:26,height:26,borderRadius:5,objectFit:'cover',flexShrink:0,border:`1px solid ${meal.color}22`}}/>
                      : <div style={{width:26,height:26,borderRadius:5,background:meal.color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>🍽</div>
                    }
                    <span style={{ flex:1, fontSize:12, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }} title={name}>{name}</span>
                    <button type="button" onClick={() => onRemove(dateStr, meal.key, id)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:2, color:'var(--text-3)', display:'flex', flexShrink:0, opacity:0, transition:'opacity 0.15s' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='1'}
                      onMouseLeave={e=>e.currentTarget.style.opacity='0'}
                    >
                      <X size={11}/>
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────
export default function CalendarView({ recipes, lang }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [plans, setPlans] = useState({})
  const [loading, setLoading] = useState(false)
  const [picker, setPicker]   = useState(null) // {date, meal}
  const [saving, setSaving]   = useState(false)

  const days = getMonthDays(year, month)
  // Date range for API
  const monthDays = days.filter(Boolean)
  const fromStr   = monthDays.length > 0 ? toDateStr(monthDays[0]) : toDateStr(new Date(year, month, 1))
  const toStr     = monthDays.length > 0 ? toDateStr(monthDays[monthDays.length-1]) : toDateStr(new Date(year, month+1, 0))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchMealPlans(fromStr, toStr)
      const map  = {}
      for (const row of rows) {
        // DB returns "2026-03-11T00:00:00.000Z" — normalize to "2026-03-11"
        const dateKey = (row.plan_date || '').split('T')[0]
        map[`${dateKey}|${row.meal_type}`] = { ...row, plan_date: dateKey }
      }
      setPlans(map)
    } catch(e) { console.error('Load plans error:', e) }
    setLoading(false)
  }, [fromStr, toStr])

  useEffect(() => { load() }, [load])

  function recipeById(id) { return recipes.find(r => r.id === id) }

  async function handleAdd(date, meal, recipe) {
    const slot   = plans[`${date}|${meal}`] || { recipe_ids: [] }
    const newIds = [...(slot.recipe_ids||[]).filter(id=>id!==recipe.id), recipe.id]
    setSaving(true)
    try {
      const updated = await upsertMealPlan(date, meal, newIds, slot.custom_note||'')
      const dateKey = (updated.plan_date||date).split('T')[0]
      setPlans(p => ({ ...p, [`${date}|${meal}`]: { ...updated, plan_date: dateKey } }))
    } catch(e) { console.error('Add failed:', e); alert('Ошибка: ' + e.message) }
    setSaving(false)
    setPicker(null)
  }

  async function handleRemove(date, meal, recipeId) {
    const slot   = plans[`${date}|${meal}`] || { recipe_ids: [] }
    const newIds = (slot.recipe_ids||[]).filter(id => id !== recipeId)
    try {
      if (newIds.length === 0 && !slot.custom_note) {
        await deleteMealPlan(date, meal)
        setPlans(p => { const n={...p}; delete n[`${date}|${meal}`]; return n })
      } else {
        const updated = await upsertMealPlan(date, meal, newIds, slot.custom_note||'')
        setPlans(p => ({ ...p, [`${date}|${meal}`]: updated }))
      }
    } catch(e) { console.error('Remove failed:', e) }
  }

  function prevMonth() {
    if (month === 0) { setYear(y=>y-1); setMonth(11) }
    else setMonth(m=>m-1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y=>y+1); setMonth(0) }
    else setMonth(m=>m+1)
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const totalPlanned = Object.values(plans).reduce((s,p)=>s+(p.recipe_ids?.length||0), 0)

  // Split days into weeks for week labels
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i+7))

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 20px 60px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Calendar size={22} color="var(--accent)"/>
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', lineHeight:1 }}>
              {MONTH_RU[month]} {year}
            </h2>
            <p style={{ color:'var(--text-3)', fontSize:13, marginTop:2 }}>
              {totalPlanned > 0
                ? <span style={{color:'var(--accent)',fontWeight:600}}>{totalPlanned} блюд запланировано</span>
                : 'Нажми + чтобы добавить блюдо в день'
              }
              {saving && <span style={{color:'var(--text-3)',marginLeft:8}}>💾 Сохраняю…</span>}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button type="button" className="btn btn-secondary" style={{padding:'7px 14px',fontSize:13}} onClick={goToday}>Сегодня</button>
          <button type="button" className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={prevMonth}><ChevronLeft size={17}/></button>
          <button type="button" className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={nextMonth}><ChevronRight size={17}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, marginBottom:14, flexWrap:'wrap' }}>
        {MEALS.map(m => (
          <span key={m.key} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'var(--text-3)' }}>
            <span style={{fontSize:13}}>{m.emoji}</span> {m.label}
          </span>
        ))}
        <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:'auto' }}>
          Эмодзи в правом углу дня = уже заполнено
        </span>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:6 }}>
        {DAY_SHORT.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
          {Array.from({length:35}).map((_,i) => (
            <div key={i} className="skeleton" style={{height:180, borderRadius:14}}/>
          ))}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
              {week.map((day, di) => {
                if (!day) return <div key={`empty-${wi}-${di}`} style={{ borderRadius:14, background:'var(--bg-2)', opacity:0.3, minHeight:160 }}/>
                return (
                  <DayCard
                    key={toDateStr(day)}
                    day={day}
                    plans={plans}
                    recipeById={recipeById}
                    lang={lang}
                    onAddClick={(d,m) => setPicker({date:d, meal:m})}
                    onRemove={handleRemove}
                  />
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Mobile: stack */}
      <style>{`
        @media(max-width:700px){
          .cal-month-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media(max-width:420px){
          .cal-month-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {picker && (
        <RecipePicker
          recipes={recipes}
          lang={lang}
          onSelect={r => handleAdd(picker.date, picker.meal, r)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
