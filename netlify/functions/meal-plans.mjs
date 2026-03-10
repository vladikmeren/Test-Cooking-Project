import { getDb } from './db.mjs'

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_date   DATE NOT NULL,
      meal_type   TEXT NOT NULL,
      recipe_ids  UUID[] DEFAULT '{}',
      custom_note TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(plan_date, meal_type)
    )`
}

export default async function handler(req) {
  const sql = getDb()
  await ensureSchema(sql)

  // GET /meal-plans?from=2025-01-01&to=2025-01-31
  if (req.method === 'GET') {
    const url  = new URL(req.url)
    const from = url.searchParams.get('from')
    const to   = url.searchParams.get('to')
    if (!from || !to) {
      return new Response(JSON.stringify({ error: 'from and to required' }), { status: 400 })
    }
    const rows = await sql`
      SELECT * FROM meal_plans
      WHERE plan_date >= ${from}::date AND plan_date <= ${to}::date
      ORDER BY plan_date, meal_type`
    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // PUT /meal-plans — upsert a slot
  if (req.method === 'PUT') {
    const body = await req.json()
    const { plan_date, meal_type, recipe_ids = [], custom_note = '' } = body
    if (!plan_date || !meal_type) {
      return new Response(JSON.stringify({ error: 'plan_date and meal_type required' }), { status: 400 })
    }
    const [row] = await sql`
      INSERT INTO meal_plans (plan_date, meal_type, recipe_ids, custom_note)
      VALUES (${plan_date}, ${meal_type}, ${sql.array(recipe_ids)}, ${custom_note})
      ON CONFLICT (plan_date, meal_type) DO UPDATE
        SET recipe_ids  = EXCLUDED.recipe_ids,
            custom_note = EXCLUDED.custom_note
      RETURNING *`
    return new Response(JSON.stringify(row), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // DELETE /meal-plans?date=2025-01-01&meal=breakfast
  if (req.method === 'DELETE') {
    const url      = new URL(req.url)
    const planDate = url.searchParams.get('date')
    const mealType = url.searchParams.get('meal')
    await sql`DELETE FROM meal_plans WHERE plan_date = ${planDate}::date AND meal_type = ${mealType}`
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
