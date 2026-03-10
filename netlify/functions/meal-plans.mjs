import { getDb } from './db.mjs'

async function ensureSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_date   DATE NOT NULL,
      meal_type   TEXT NOT NULL,
      recipe_ids  UUID[] DEFAULT '{}',
      custom_note TEXT DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(plan_date, meal_type)
    )`
}

export default async function handler(req) {
  const sql = getDb()
  try {
    await ensureSchema(sql)
  } catch(e) {
    // Table might exist with UUID type, try migration
    try {
      // column already uuid[] - no migration needed
    } catch(_) {}
  }

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

  if (req.method === 'PUT') {
    let body
    try { body = await req.json() } catch(e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
    }
    const { plan_date, meal_type, recipe_ids = [], custom_note = '' } = body
    if (!plan_date || !meal_type) {
      return new Response(JSON.stringify({ error: 'plan_date and meal_type required' }), { status: 400 })
    }

    // Build TEXT[] literal — safe since UUIDs only contain [a-f0-9-]
    const idsLiteral = `{${recipe_ids.filter(Boolean).join(',')}}`

    const [row] = await sql`
      INSERT INTO meal_plans (plan_date, meal_type, recipe_ids, custom_note)
      VALUES (${plan_date}, ${meal_type}, ${idsLiteral}::uuid[], ${custom_note})
      ON CONFLICT (plan_date, meal_type) DO UPDATE
        SET recipe_ids  = EXCLUDED.recipe_ids,
            custom_note = EXCLUDED.custom_note
      RETURNING *`

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    const url      = new URL(req.url)
    const planDate = url.searchParams.get('date')
    const mealType = url.searchParams.get('meal')
    await sql`DELETE FROM meal_plans WHERE plan_date = ${planDate}::date AND meal_type = ${mealType}`
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
