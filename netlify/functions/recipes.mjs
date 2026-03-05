import { getDb, ensureTable } from './db.mjs'

export default async function handler(req) {
  const sql = getDb()
  await ensureTable(sql)

  // GET — fetch recipes
  if (req.method === 'GET') {
    const url    = new URL(req.url)
    const cat    = url.searchParams.get('category')
    const search = url.searchParams.get('search')

    let rows
    if (cat && search) {
      rows = await sql`
        SELECT * FROM recipes
        WHERE category = ${cat}
          AND (title ILIKE ${'%'+search+'%'} OR title_en ILIKE ${'%'+search+'%'} OR description ILIKE ${'%'+search+'%'})
        ORDER BY created_at DESC`
    } else if (cat) {
      rows = await sql`SELECT * FROM recipes WHERE category = ${cat} ORDER BY created_at DESC`
    } else if (search) {
      rows = await sql`
        SELECT * FROM recipes
        WHERE title ILIKE ${'%'+search+'%'}
           OR title_en ILIKE ${'%'+search+'%'}
           OR description ILIKE ${'%'+search+'%'}
        ORDER BY created_at DESC`
    } else {
      rows = await sql`SELECT * FROM recipes ORDER BY created_at DESC`
    }

    return new Response(JSON.stringify(rows), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // POST — insert recipe
  if (req.method === 'POST') {
    const r = await req.json()
    const [row] = await sql`
      INSERT INTO recipes
        (title, title_en, description, description_en, source_url, thumbnail,
         platform, source_type, time_minutes, difficulty, servings, category,
         tags, ingredients, steps, is_manual)
      VALUES
        (${r.title}, ${r.title_en||null}, ${r.description||null}, ${r.description_en||null},
         ${r.source_url||null}, ${r.thumbnail||null}, ${r.platform||'website'},
         ${r.source_type||'website'}, ${r.time_minutes||null}, ${r.difficulty||null},
         ${r.servings||null}, ${r.category||null},
         ${r.tags||[]}, ${r.ingredients||[]}, ${r.steps||[]}, ${r.is_manual||false})
      RETURNING *`
    return new Response(JSON.stringify(row), {
      status: 201, headers: { 'Content-Type': 'application/json' }
    })
  }

  // DELETE — delete recipe by id
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
    await sql`DELETE FROM recipes WHERE id = ${id}`
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
