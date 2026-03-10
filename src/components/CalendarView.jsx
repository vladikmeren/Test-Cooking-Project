import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, Clock, Search, Calendar, Trash2 } from 'lucide-react'
import { fetchMealPlans, upsertMealPlan, deleteMealPlan } from '../lib/api.js'

const MEALS = [
  { key: 'breakfast', emoji: '🌅', label: 'Завтрак', color: '#d97706', bg: '#fffbeb' },
  { key: 'lunch',     emoji: '☀️', label: 'Обед',    color: '#16a34a', bg: '#f0fdf4' },
  { key: 'dinner',    emoji: '🌙', label: 'Ужин',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'snack',     emoji: '🍎', label: 'Перекус', color: '#ea580c', bg: '#fff7ed' },
]

const DAY_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const MONTH_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function toDateStr(d) { return d.toISOString().split('T')[0] }
function isToday(d)   { return toDateStr(d) === toDateStr(new Date()) }
function isPast(d)    { const t=new Date(); t.setHours(0,0,0,0); return d<t }
function dow(d)       { return d.getDay()===0?6:d.getDay()-1 }

function getMonthDays(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month+1, 0)
  const days  = []
  for (let i = 0; i < dow(first); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

// ── Recipe Picker Modal ────────────────────────────────────────────────────
function RecipePicker({ recipes, lang, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const ref = useRef()
  const list = recipes.filter(r =>
    (r.title||'').toLowerCase().includes(q.toLowerCase()) ||
    (r.title_en||'').toLowerCase().includes(q.toLowerCase())
  )
  useEffect(() => { setTimeout(()=>ref.current?.focus(), 60) }, [])

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:1100}}>
      <div className="modal" style={{maxWidth:440, zIndex:1101}}>
        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontFamily:'Playfair Display,serif',fontSize:18,fontWeight:700}}>Выбрать рецепт</span>
          <button type="button" className="btn btn-ghost" style={{padding:6}} onClick={onClose}><X size={17}/></button>
        </div>
        <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
          <div style={{position:'relative'}}>
            <Search size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)',pointerEvents:'none'}}/>
            <input ref={ref} className="input" style={{paddingLeft:34,fontSize:14}} placeholder="Найти рецепт..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
        </div>
        <div style={{maxHeight:420,overflowY:'auto'}}>
          {list.length===0 && <div style={{padding:'32px 20px',textAlign:'center',color:'var(--text-3)',fontSize:14}}>Нет рецептов</div>}
          {list.map(r => {
            const name = (lang==='en'&&r.title_en)?r.title_en:r.title
            return (
              <button key={r.id} type="button" onClick={()=>onSelect(r)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 18px',background:'none',border:'none',cursor:'pointer',borderBottom:'1px solid var(--border)',textAlign:'left',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}
              >
                {r.thumbnail
                  ? <img src={r.thumbnail} alt="" style={{width:44,height:44,borderRadius:9,objectFit:'cover',flexShrink:0}}/>
                  : <div style={{width:44,height:44,borderRadius:9,background:'var(--bg-2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22}}>🍽</div>
                }
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                  {r.time_minutes && <div style={{fontSize:12,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3,marginTop:2}}><Clock size={11}/> {r.time_minutes} мин</div>}
                </div>
                <span style={{fontSize:12,color:'var(--accent)',fontWeight:600,flexShrink:0}}>+ Добавить</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Day Detail Modal (full-screen) ─────────────────────────────────────────
function DayModal({ day, plans, recipeById, lang, onAddClick, onRemove, onClose }) {
  const dateStr = toDateStr(day)
  const today   = isToday(day)
  const dayName = DAY_SHORT[dow(day)]
  const monthName = MONTH_RU[day.getMonth()]

  // Close on Escape
  useEffect(() => {
    const onKey = e => { if (e.key==='Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const totalDishes = MEALS.reduce((s, m) => s + (plans[`${dateStr}|${m.key}`]?.recipe_ids?.length||0), 0)

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()} style={{zIndex:900, alignItems:'center', padding:'20px'}}>
      <div style={{
        background:'var(--bg-card)',
        borderRadius:20,
        width:'100%',
        maxWidth:760,
        maxHeight:'90vh',
        display:'flex',
        flexDirection:'column',
        overflow:'hidden',
        boxShadow:'0 25px 60px rgba(0,0,0,0.25)',
        animation:'modalSlideUp 0.22s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        <style>{`@keyframes modalSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{
          padding:'20px 24px 16px',
          borderBottom:'1px solid var(--border)',
          background: today ? 'var(--accent-light)' : 'var(--bg-card)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
        }}>
          <div>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <span style={{fontSize:13,fontWeight:700,color:today?'var(--accent)':'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{dayName}</span>
              <span style={{fontSize:32,fontWeight:800,color:today?'var(--accent)':'var(--text)',letterSpacing:'-0.02em',lineHeight:1}}>{day.getDate()}</span>
              <span style={{fontSize:16,fontWeight:500,color:'var(--text-2)'}}>{monthName} {day.getFullYear()}</span>
              {today && <span style={{fontSize:10,fontWeight:700,color:'var(--accent)',background:'var(--accent-light)',borderRadius:5,padding:'2px 7px',border:'1px solid var(--accent)',letterSpacing:'0.04em'}}>СЕГОДНЯ</span>}
            </div>
            <div style={{fontSize:13,color:'var(--text-3)',marginTop:3}}>
              {totalDishes>0
                ? <span style={{color:'var(--accent)',fontWeight:600}}>{totalDishes} блюд запланировано</span>
                : 'Нет блюд — нажми + чтобы добавить'
              }
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{width:36,height:36,borderRadius:10,background:'var(--bg-2)',border:'1px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3,#e5e7eb)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--bg-2)'}
          >
            <X size={17}/>
          </button>
        </div>

        {/* Meal Sections */}
        <div style={{overflowY:'auto',flex:1,padding:'16px 24px 24px',display:'flex',flexDirection:'column',gap:12}}>
          {MEALS.map(meal => {
            const slot = plans[`${dateStr}|${meal.key}`] || { recipe_ids: [] }
            const ids  = slot.recipe_ids || []

            return (
              <div key={meal.key} style={{
                borderRadius:14,
                border:`1px solid ${ids.length>0 ? meal.color+'33' : 'var(--border)'}`,
                background: ids.length>0 ? meal.color+'08' : 'var(--bg-2)',
                overflow:'hidden',
              }}>
                {/* Meal header */}
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 16px',
                  borderBottom: ids.length>0 ? `1px solid ${meal.color}22` : 'none',
                  background: ids.length>0 ? meal.color+'10' : 'transparent',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>{meal.emoji}</span>
                    <span style={{fontSize:15,fontWeight:700,color:meal.color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{meal.label}</span>
                    {ids.length>0 && (
                      <span style={{fontSize:11,fontWeight:700,background:meal.color,color:'#fff',borderRadius:99,padding:'1px 7px'}}>{ids.length}</span>
                    )}
                  </div>
                  <button type="button"
                    onClick={()=>onAddClick(dateStr, meal.key)}
                    style={{
                      display:'flex',alignItems:'center',gap:5,
                      padding:'6px 12px',borderRadius:8,
                      background: ids.length>0 ? meal.color+'18' : 'var(--bg-card)',
                      border:`1px solid ${ids.length>0 ? meal.color+'44' : 'var(--border)'}`,
                      cursor:'pointer',fontSize:12,fontWeight:600,color:ids.length>0?meal.color:'var(--text-3)',
                      transition:'all 0.12s',
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background=meal.color+'28';e.currentTarget.style.borderColor=meal.color}}
                    onMouseLeave={e=>{e.currentTarget.style.background=ids.length>0?meal.color+'18':'var(--bg-card)';e.currentTarget.style.borderColor=ids.length>0?meal.color+'44':'var(--border)'}}
                  >
                    <Plus size={13}/> Добавить
                  </button>
                </div>

                {/* Recipe cards grid */}
                {ids.length>0 && (
                  <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                    {ids.map(id => {
                      const r = recipeById(id)
                      if (!r) return null
                      const name = (lang==='en'&&r.title_en)?r.title_en:r.title
                      return (
                        <div key={id} style={{
                          display:'flex',alignItems:'center',gap:10,
                          background:'var(--bg-card)',borderRadius:10,
                          padding:'8px 10px',
                          border:`1px solid ${meal.color}22`,
                          boxShadow:`0 1px 4px ${meal.color}12`,
                          position:'relative',
                          transition:'box-shadow 0.15s',
                        }}
                          onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 3px 10px ${meal.color}28`}
                          onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 1px 4px ${meal.color}12`}
                        >
                          {r.thumbnail
                            ? <img src={r.thumbnail} alt="" style={{width:46,height:46,borderRadius:8,objectFit:'cover',flexShrink:0}}/>
                            : <div style={{width:46,height:46,borderRadius:8,background:meal.color+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22}}>🍽</div>
                          }
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{name}</div>
                            {r.time_minutes && <div style={{fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3,marginTop:3}}><Clock size={10}/>{r.time_minutes} мин</div>}
                          </div>
                          <button type="button"
                            onClick={()=>onRemove(dateStr, meal.key, id)}
                            style={{position:'absolute',top:5,right:5,width:18,height:18,borderRadius:5,background:'var(--bg-2)',border:'1px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 0.15s'}}
                            onMouseEnter={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.background='#fef2f2';e.currentTarget.style.borderColor='#ef4444'}}
                            onMouseLeave={e=>{e.currentTarget.style.opacity='0'}}
                          >
                            <X size={9} color="#ef4444"/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {ids.length===0 && (
                  <div style={{padding:'14px 16px',fontSize:13,color:'var(--text-3)',textAlign:'center'}}>
                    Пусто — нажми «Добавить»
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Day Cell (compact calendar grid cell) ─────────────────────────────────
function DayCell({ day, plans, onClick }) {
  const dateStr     = toDateStr(day)
  const today       = isToday(day)
  const past        = isPast(day)
  const filledMeals = MEALS.filter(m => (plans[`${dateStr}|${m.key}`]?.recipe_ids?.length||0)>0)
  const totalDishes = MEALS.reduce((s,m)=>s+(plans[`${dateStr}|${m.key}`]?.recipe_ids?.length||0),0)

  return (
    <div
      onClick={() => onClick(day)}
      style={{
        borderRadius:12,
        border: today ? '2px solid var(--accent)' : '1px solid var(--border)',
        background: filledMeals.length>0 ? 'var(--bg-card)' : 'var(--bg-card)',
        overflow:'hidden',
        opacity: past&&!today ? 0.65 : 1,
        boxShadow: today
          ? '0 0 0 3px var(--accent-light), 0 2px 8px rgba(0,0,0,0.08)'
          : filledMeals.length>0 ? '0 2px 8px rgba(0,0,0,0.07)' : 'var(--shadow-xs)',
        cursor:'pointer',
        transition:'box-shadow 0.15s, transform 0.12s',
        userSelect:'none',
        minHeight: 90,
        display:'flex',
        flexDirection:'column',
      }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)';e.currentTarget.style.transform='translateY(-1px)'}}
      onMouseLeave={e=>{
        e.currentTarget.style.transform='translateY(0)'
        e.currentTarget.style.boxShadow=today
          ?'0 0 0 3px var(--accent-light), 0 2px 8px rgba(0,0,0,0.08)'
          :filledMeals.length>0?'0 2px 8px rgba(0,0,0,0.07)':'var(--shadow-xs)'
      }}
    >
      {/* Date */}
      <div style={{
        padding:'8px 10px 6px',
        background: today ? 'var(--accent-light)' : 'transparent',
        display:'flex',alignItems:'flex-start',justifyContent:'space-between',
      }}>
        <div>
          <div style={{fontSize:9,fontWeight:700,color:today?'var(--accent)':'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.08em',lineHeight:1}}>{DAY_SHORT[dow(day)]}</div>
          <div style={{fontSize:22,fontWeight:800,color:today?'var(--accent)':'var(--text)',lineHeight:1.1,letterSpacing:'-0.02em'}}>{day.getDate()}</div>
        </div>
        {/* Dishes badge */}
        {totalDishes>0 && (
          <span style={{
            fontSize:10,fontWeight:700,background:'var(--accent)',color:'#fff',
            borderRadius:99,padding:'1px 6px',marginTop:2,
            boxShadow:'0 1px 4px rgba(0,0,0,0.15)',
          }}>{totalDishes}</span>
        )}
      </div>

      {/* Meal emoji indicators */}
      <div style={{flex:1,padding:'4px 8px 8px',display:'flex',flexWrap:'wrap',gap:3,alignContent:'flex-start'}}>
        {filledMeals.length===0 && (
          <span style={{fontSize:10,color:'var(--text-3)',opacity:0.5,width:'100%',textAlign:'center',paddingTop:4}}>+</span>
        )}
        {filledMeals.map(m => {
          const count = plans[`${dateStr}|${m.key}`]?.recipe_ids?.length||0
          return (
            <span key={m.key}
              style={{
                display:'inline-flex',alignItems:'center',gap:2,
                background:m.color+'15',border:`1px solid ${m.color}30`,
                borderRadius:6,padding:'2px 5px',
                fontSize:11,lineHeight:1,
              }}
              title={`${m.label}: ${count} блюд`}
            >
              {m.emoji}
              {count>1 && <span style={{fontSize:9,fontWeight:700,color:m.color}}>{count}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Main CalendarView ──────────────────────────────────────────────────────
export default function CalendarView({ recipes, lang }) {
  const today = new Date()
  const [year,    setYear]    = useState(today.getFullYear())
  const [month,   setMonth]   = useState(today.getMonth())
  const [plans,   setPlans]   = useState({})
  const [loading, setLoading] = useState(false)
  const [dayModal, setDayModal] = useState(null)   // Date object
  const [picker,   setPicker]  = useState(null)     // {date, meal}
  const [saving,   setSaving]  = useState(false)

  const days     = getMonthDays(year, month)
  const realDays = days.filter(Boolean)
  const fromStr  = realDays.length>0 ? toDateStr(realDays[0]) : toDateStr(new Date(year,month,1))
  const toStr    = realDays.length>0 ? toDateStr(realDays[realDays.length-1]) : toDateStr(new Date(year,month+1,0))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchMealPlans(fromStr, toStr)
      const map  = {}
      for (const row of rows) {
        const dk = (row.plan_date||'').split('T')[0]
        map[`${dk}|${row.meal_type}`] = { ...row, plan_date: dk }
      }
      setPlans(map)
    } catch(e) { console.error(e) }
    setLoading(false)
  }, [fromStr, toStr])

  useEffect(() => { load() }, [load])

  function recipeById(id) { return recipes.find(r=>r.id===id) }

  async function handleAdd(date, meal, recipe) {
    const slot   = plans[`${date}|${meal}`] || { recipe_ids:[] }
    const newIds = [...(slot.recipe_ids||[]).filter(id=>id!==recipe.id), recipe.id]
    setSaving(true)
    try {
      const upd = await upsertMealPlan(date, meal, newIds, slot.custom_note||'')
      const dk  = (upd.plan_date||date).split('T')[0]
      setPlans(p => ({ ...p, [`${date}|${meal}`]: { ...upd, plan_date: dk } }))
    } catch(e) { console.error(e); alert('Ошибка: '+e.message) }
    setSaving(false)
    setPicker(null)
  }

  async function handleRemove(date, meal, recipeId) {
    const slot   = plans[`${date}|${meal}`] || { recipe_ids:[] }
    const newIds = (slot.recipe_ids||[]).filter(id=>id!==recipeId)
    try {
      if (newIds.length===0 && !slot.custom_note) {
        await deleteMealPlan(date, meal)
        setPlans(p => { const n={...p}; delete n[`${date}|${meal}`]; return n })
      } else {
        const upd = await upsertMealPlan(date, meal, newIds, slot.custom_note||'')
        const dk  = (upd.plan_date||date).split('T')[0]
        setPlans(p => ({ ...p, [`${date}|${meal}`]: { ...upd, plan_date: dk } }))
      }
    } catch(e) { console.error(e) }
  }

  function prevMonth() { if(month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1) }
  function nextMonth() { if(month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1) }
  function goToday()   { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const totalPlanned = Object.values(plans).reduce((s,p)=>s+(p.recipe_ids?.length||0),0)
  const weeks = []
  for (let i=0; i<days.length; i+=7) weeks.push(days.slice(i,i+7))

  return (
    <div style={{maxWidth:1400,margin:'0 auto',padding:'20px 20px 60px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <Calendar size={22} color="var(--accent)"/>
          <div>
            <h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.02em',lineHeight:1}}>
              {MONTH_RU[month]} {year}
            </h2>
            <p style={{color:'var(--text-3)',fontSize:13,marginTop:2}}>
              {totalPlanned>0
                ? <span style={{color:'var(--accent)',fontWeight:600}}>{totalPlanned} блюд запланировано</span>
                : 'Нажми на день чтобы добавить блюда'
              }
              {saving && <span style={{color:'var(--text-3)',marginLeft:8}}>💾 Сохраняю…</span>}
            </p>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button type="button" className="btn btn-secondary" style={{padding:'7px 14px',fontSize:13}} onClick={goToday}>Сегодня</button>
          <button type="button" className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={prevMonth}><ChevronLeft size={17}/></button>
          <button type="button" className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={nextMonth}><ChevronRight size={17}/></button>
        </div>
      </div>

      {/* Legend */}
      <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        {MEALS.map(m=>(
          <span key={m.key} style={{display:'inline-flex',alignItems:'center',gap:4,background:m.color+'12',border:`1px solid ${m.color}30`,borderRadius:6,padding:'3px 8px',fontSize:12,color:m.color,fontWeight:600}}>
            {m.emoji} {m.label}
          </span>
        ))}
        <span style={{fontSize:12,color:'var(--text-3)',marginLeft:4}}>← нажми на день чтобы открыть</span>
      </div>

      {/* DoW headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6,marginBottom:6}}>
        {DAY_SHORT.map(d=>(
          <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.07em',padding:'3px 0'}}>{d}</div>
        ))}
      </div>

      {loading ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
          {Array.from({length:35}).map((_,i)=>(
            <div key={i} className="skeleton" style={{height:90,borderRadius:12}}/>
          ))}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
              {week.map((day,di)=>{
                if(!day) return (
                  <div key={`e-${wi}-${di}`} style={{borderRadius:12,background:'var(--bg-2)',opacity:0.25,minHeight:90}}/>
                )
                return (
                  <DayCell key={toDateStr(day)} day={day} plans={plans} onClick={setDayModal}/>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Day detail modal */}
      {dayModal && (
        <DayModal
          day={dayModal}
          plans={plans}
          recipeById={recipeById}
          lang={lang}
          onAddClick={(date,meal) => { setPicker({date,meal}) }}
          onRemove={handleRemove}
          onClose={() => setDayModal(null)}
        />
      )}

      {/* Recipe picker — on top of day modal */}
      {picker && (
        <RecipePicker
          recipes={recipes}
          lang={lang}
          onSelect={r=>handleAdd(picker.date,picker.meal,r)}
          onClose={()=>setPicker(null)}
        />
      )}
    </div>
  )
}
