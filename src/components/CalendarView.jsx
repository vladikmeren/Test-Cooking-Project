import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Clock, Search, Calendar } from 'lucide-react'
import { fetchMealPlans, upsertMealPlan, deleteMealPlan } from '../lib/api.js'

const MEALS = [
  { key: 'breakfast', emoji: '🌅', label: 'Завтрак', color: '#d97706' },
  { key: 'lunch',     emoji: '☀️', label: 'Обед',    color: '#16a34a' },
  { key: 'dinner',    emoji: '🌙', label: 'Ужин',    color: '#7c3aed' },
  { key: 'snack',     emoji: '🍎', label: 'Перекус', color: '#ea580c' },
]

const DAY_SHORT  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const MONTH_RU   = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function toDateStr(d)     { return d.toISOString().split('T')[0] }
function addDays(d, n)    { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function getMonday(d)     { const r = new Date(d); const day = r.getDay()||7; r.setDate(r.getDate()-day+1); r.setHours(0,0,0,0); return r }
function isToday(d)       { return toDateStr(d) === toDateStr(new Date()) }
function isPast(d)        { const t=new Date(); t.setHours(0,0,0,0); return d<t }
function dayOfWeek(d)     { return d.getDay()===0?6:d.getDay()-1 }

// ─── Recipe Picker ────────────────────────────────────────────────────────
function RecipePicker({ recipes, lang, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const ref = useRef()
  const list = recipes.filter(r =>
    (r.title||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.title_en||'').toLowerCase().includes(q.toLowerCase())
  )
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'Playfair Display,serif', fontSize:18, fontWeight:700 }}>Выбрать рецепт</span>
          <button type="button" className="btn btn-ghost" style={{padding:6}} onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }}/>
            <input ref={ref} className="input" style={{ paddingLeft:34, fontSize:14, padding:'9px 12px 9px 34px' }}
              placeholder="Найти рецепт..." value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        <div style={{ maxHeight:400, overflowY:'auto' }}>
          {list.length === 0 && <div style={{padding:'32px 20px', textAlign:'center', color:'var(--text-3)', fontSize:14}}>Не найдено</div>}
          {list.map(r => (
            <button key={r.id} type="button"
              onClick={() => onSelect(r)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 18px', background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--border)', textAlign:'left' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
            >
              {r.thumbnail
                ? <img src={r.thumbnail} alt="" style={{ width:42,height:42,borderRadius:8,objectFit:'cover',flexShrink:0 }}/>
                : <div style={{ width:42,height:42,borderRadius:8,background:'var(--bg-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20 }}>🍽</div>
              }
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {lang==='en'&&r.title_en ? r.title_en : r.title}
                </div>
                {r.time_minutes && <div style={{fontSize:12,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3,marginTop:2}}><Clock size={11}/> {r.time_minutes} мин</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Single day cell ──────────────────────────────────────────────────────
function DayCell({ day, plans, recipeById, lang, onAddClick, onRemove, compact }) {
  const dateStr = toDateStr(day)
  const today   = isToday(day)
  const past    = isPast(day)
  const dow     = dayOfWeek(day)

  return (
    <div style={{
      borderRadius: 12,
      border: today ? '2px solid var(--accent)' : '1px solid var(--border)',
      background: 'var(--bg-card)',
      overflow: 'hidden',
      opacity: past && !today ? 0.72 : 1,
      boxShadow: today ? '0 0 0 3px var(--accent-light)' : 'var(--shadow-xs)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: compact ? 'auto' : 180,
    }}>
      {/* Day header */}
      <div style={{
        padding: compact ? '6px 10px 5px' : '8px 12px 6px',
        background: today ? 'var(--accent-light)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'baseline', gap: 5,
      }}>
        <span style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing:'0.07em' }}>{DAY_SHORT[dow]}</span>
        <span style={{ fontSize: compact ? 18 : 22, fontWeight: 700, color: today ? 'var(--accent)' : 'var(--text)', lineHeight:1 }}>{day.getDate()}</span>
        {today && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background:'var(--accent-light)', borderRadius:4, padding:'1px 5px', border:'1px solid var(--accent)', letterSpacing:'0.04em' }}>СЕГОДНЯ</span>}
      </div>

      {/* Meal slots */}
      <div style={{ flex: 1 }}>
        {MEALS.map(meal => {
          const slot = plans[`${dateStr}|${meal.key}`] || { recipe_ids: [] }
          const ids  = slot.recipe_ids || []
          return (
            <div key={meal.key} style={{
              borderBottom: '1px solid var(--border)',
              padding: compact ? '4px 8px' : '6px 10px',
            }}>
              {/* Meal label row */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: ids.length > 0 ? 4 : 0 }}>
                <span style={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: meal.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {meal.emoji} {meal.label}
                </span>
                <button type="button" onClick={() => onAddClick(dateStr, meal.key)}
                  style={{ width:18, height:18, borderRadius:5, background:'var(--bg-2)', border:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.1s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-light)';e.currentTarget.style.borderColor='var(--accent)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='var(--bg-2)';e.currentTarget.style.borderColor='var(--border)'}}
                >
                  <Plus size={10} color="var(--text-3)"/>
                </button>
              </div>

              {/* Recipe chips */}
              {ids.map(id => {
                const r = recipeById(id)
                if (!r) return null
                const name = (lang==='en'&&r.title_en) ? r.title_en : r.title
                return (
                  <div key={id} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:3, background:'var(--bg-2)', borderRadius:6, padding:'3px 5px', border:'1px solid var(--border)' }}>
                    {r.thumbnail && <img src={r.thumbnail} alt="" style={{width:16,height:16,borderRadius:3,objectFit:'cover',flexShrink:0}}/>}
                    <span style={{ flex:1, fontSize:10, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={name}>{name}</span>
                    <button type="button" onClick={()=>onRemove(dateStr, meal.key, id)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:1, color:'var(--text-3)', display:'flex', flexShrink:0 }}>
                      <X size={9}/>
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

// ─── Main CalendarView ────────────────────────────────────────────────────
export default function CalendarView({ recipes, lang }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [plans,     setPlans]     = useState({})
  const [loading,   setLoading]   = useState(false)
  const [picker,    setPicker]    = useState(null)

  // Show 2 weeks (14 days)
  const days     = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))
  const week1    = days.slice(0, 7)
  const week2    = days.slice(7, 14)
  const fromStr  = toDateStr(days[0])
  const toStr    = toDateStr(days[13])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchMealPlans(fromStr, toStr)
      const map = {}
      for (const row of rows) map[`${row.plan_date}|${row.meal_type}`] = row
      setPlans(map)
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [fromStr, toStr])

  useEffect(() => { load() }, [load])

  function recipeById(id) { return recipes.find(r => r.id === id) }

  async function handleAdd(date, meal, recipe) {
    const slot   = plans[`${date}|${meal}`] || { recipe_ids: [] }
    const newIds = [...(slot.recipe_ids||[]).filter(id=>id!==recipe.id), recipe.id]
    try {
      const updated = await upsertMealPlan(date, meal, newIds, slot.custom_note||'')
      setPlans(p => ({ ...p, [`${date}|${meal}`]: updated }))
    } catch(e) { console.error('Failed to add:', e) }
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
    } catch(e) { console.error('Failed to remove:', e) }
  }

  const totalPlanned = Object.values(plans).reduce((s,p) => s+(p.recipe_ids?.length||0), 0)

  // Month label
  const m0 = MONTH_RU[days[0].getMonth()]
  const m1 = MONTH_RU[days[13].getMonth()]
  const yr  = days[0].getFullYear()
  const monthLabel = m0===m1 ? `${m0} ${yr}` : `${m0}–${m1} ${yr}`

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Calendar size={22} color="var(--accent)"/>
            <h2 style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.02em' }}>Меню на 2 недели</h2>
          </div>
          <p style={{ color:'var(--text-3)', fontSize:13, marginTop:3 }}>
            {monthLabel}
            {totalPlanned > 0 && <span style={{ color:'var(--accent)', fontWeight:600 }}> · {totalPlanned} блюд</span>}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button type="button" className="btn btn-secondary" style={{ padding:'7px 14px', fontSize:13 }}
            onClick={() => setWeekStart(getMonday(new Date()))}>Сегодня</button>
          <button type="button" className="btn btn-ghost" style={{ padding:'7px 8px' }}
            onClick={() => setWeekStart(d => addDays(d, -14))}><ChevronLeft size={17}/></button>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--text-2)', minWidth:140, textAlign:'center' }}>{monthLabel}</span>
          <button type="button" className="btn btn-ghost" style={{ padding:'7px 8px' }}
            onClick={() => setWeekStart(d => addDays(d, 14))}><ChevronRight size={17}/></button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display:'flex', gap:14, marginBottom:16, flexWrap:'wrap' }}>
        {MEALS.map(m => (
          <span key={m.key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-3)' }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:m.color,display:'inline-block' }}/>
            {m.emoji} {m.label}
          </span>
        ))}
      </div>

      {loading && (
        <div>
          {[0,1].map(w => (
            <div key={w} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginBottom:10 }}>
              {Array.from({length:7}).map((_,i)=>(
                <div key={i} className="skeleton" style={{height:200,borderRadius:12}}/>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* ── DESKTOP: 7-col grid × 2 weeks ── */}
          <div className="cal-desktop-view">
            <style>{`
              .cal-desktop-view { display: block; }
              .cal-mobile-view  { display: none;  }
              @media (max-width: 700px) {
                .cal-desktop-view { display: none!important; }
                .cal-mobile-view  { display: block!important; }
              }
            `}</style>

            {/* Week 1 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, paddingLeft:2 }}>
                Неделя 1 · {days[0].getDate()}–{days[6].getDate()} {MONTH_RU[days[0].getMonth()]}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
                {week1.map(day => (
                  <DayCell key={toDateStr(day)} day={day} plans={plans} recipeById={recipeById}
                    lang={lang} onAddClick={(d,m)=>setPicker({date:d,meal:m})} onRemove={handleRemove} compact={false} />
                ))}
              </div>
            </div>

            {/* Week 2 */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, paddingLeft:2 }}>
                Неделя 2 · {days[7].getDate()}–{days[13].getDate()} {MONTH_RU[days[7].getMonth()]}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8 }}>
                {week2.map(day => (
                  <DayCell key={toDateStr(day)} day={day} plans={plans} recipeById={recipeById}
                    lang={lang} onAddClick={(d,m)=>setPicker({date:d,meal:m})} onRemove={handleRemove} compact={false} />
                ))}
              </div>
            </div>
          </div>

          {/* ── MOBILE: vertical list ── */}
          <div className="cal-mobile-view">
            {days.map((day, idx) => {
              const dateStr  = toDateStr(day)
              const today    = isToday(day)
              const past     = isPast(day)
              const isWeek2  = idx === 7
              const daySlots = MEALS.flatMap(m => (plans[`${dateStr}|${m.key}`]?.recipe_ids||[]).map(id=>({meal:m,id})))

              return (
                <div key={dateStr}>
                  {(idx === 0 || isWeek2) && (
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, marginTop: idx===0?0:12 }}>
                      {isWeek2 ? 'Неделя 2' : 'Неделя 1'}
                    </div>
                  )}
                  <div style={{
                    borderRadius:12, border: today?'2px solid var(--accent)':'1px solid var(--border)',
                    background:'var(--bg-card)', marginBottom:8, overflow:'hidden',
                    boxShadow: today?'0 0 0 3px var(--accent-light)':'var(--shadow-xs)',
                    opacity: past&&!today?0.75:1,
                  }}>
                    {/* Day header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background: today?'var(--accent-light)':'transparent', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div>
                          <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{DAY_SHORT[dayOfWeek(day)]} </span>
                          <span style={{ fontSize:20, fontWeight:700, color: today?'var(--accent)':'var(--text)' }}>{day.getDate()}</span>
                        </div>
                        {today && <span style={{ fontSize:9, fontWeight:700, color:'var(--accent)', background:'var(--accent-light)', borderRadius:4, padding:'1px 6px', border:'1px solid var(--accent)' }}>СЕГОДНЯ</span>}
                        {daySlots.length > 0 && <span style={{ fontSize:12, color:'var(--accent)', fontWeight:600 }}>{daySlots.length} блюд</span>}
                      </div>
                    </div>

                    {/* Mobile meal rows */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                      {MEALS.map((meal, mi) => {
                        const slot = plans[`${dateStr}|${meal.key}`] || { recipe_ids:[] }
                        const ids  = slot.recipe_ids || []
                        return (
                          <div key={meal.key} style={{
                            padding:'8px 12px',
                            borderRight: mi%2===0?'1px solid var(--border)':'none',
                            borderBottom: mi<2?'1px solid var(--border)':'none',
                          }}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:ids.length>0?5:0}}>
                              <span style={{fontSize:10,fontWeight:700,color:meal.color}}>{meal.emoji} {meal.label}</span>
                              <button type="button" onClick={()=>setPicker({date:dateStr,meal:meal.key})}
                                style={{width:18,height:18,borderRadius:5,background:'var(--bg-2)',border:'1px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <Plus size={10} color="var(--text-3)"/>
                              </button>
                            </div>
                            {ids.map(id=>{
                              const r=recipeById(id); if(!r)return null
                              const name=(lang==='en'&&r.title_en)?r.title_en:r.title
                              return (
                                <div key={id} style={{display:'flex',alignItems:'center',gap:3,marginBottom:2,background:'var(--bg-2)',borderRadius:5,padding:'2px 5px'}}>
                                  {r.thumbnail&&<img src={r.thumbnail} alt="" style={{width:14,height:14,borderRadius:3,objectFit:'cover',flexShrink:0}}/>}
                                  <span style={{flex:1,fontSize:10,fontWeight:500,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                                  <button type="button" onClick={()=>handleRemove(dateStr,meal.key,id)} style={{background:'none',border:'none',cursor:'pointer',padding:0,color:'var(--text-3)',display:'flex'}}><X size={9}/></button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {picker && (
        <RecipePicker recipes={recipes} lang={lang}
          onSelect={r=>handleAdd(picker.date, picker.meal, r)}
          onClose={()=>setPicker(null)}
        />
      )}
    </div>
  )
}
