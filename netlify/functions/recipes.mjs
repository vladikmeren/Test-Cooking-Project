import { getDb } from './db.mjs'

async function ensureSchema(sql) {
  // Create table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      title          TEXT NOT NULL,
      title_en       TEXT,
      description    TEXT,
      description_en TEXT,
      source_url     TEXT,
      thumbnail      TEXT,
      platform       TEXT DEFAULT 'website',
      source_type    TEXT DEFAULT 'website',
      time_minutes   INT,
      difficulty     TEXT,
      servings       TEXT,
      categories     TEXT[] DEFAULT '{}',
      tags           TEXT[] DEFAULT '{}',
      ingredients    TEXT[] DEFAULT '{}',
      steps          TEXT[] DEFAULT '{}',
      is_manual      BOOLEAN DEFAULT FALSE,
      calories       NUMERIC,
      protein        NUMERIC,
      fat            NUMERIC,
      carbs          NUMERIC
    )`

  // Migrate old `category` column → `categories` array (safe, idempotent)
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='recipes' AND column_name='category'
      ) THEN
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
        UPDATE recipes SET categories = ARRAY[category] WHERE category IS NOT NULL AND (categories IS NULL OR categories = '{}');
        ALTER TABLE recipes DROP COLUMN IF EXISTS category;
      END IF;
    END $$`

  // Add nutrition columns if missing
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS calories NUMERIC`
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS protein  NUMERIC`
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS fat      NUMERIC`
  await sql`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS carbs    NUMERIC`
}

export default async function handler(req) {
  const sql = getDb()
  await ensureSchema(sql)

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url      = new URL(req.url)
    const cats     = url.searchParams.get('categories')  // comma-separated
    const search   = url.searchParams.get('search')

    let rows
    const catArray = cats ? cats.split(',').filter(Boolean) : []

    if (catArray.length > 0 && search) {
      rows = await sql`
        SELECT * FROM recipes
        WHERE categories && ${catArray}
          AND (title ILIKE ${'%'+search+'%'} OR title_en ILIKE ${'%'+search+'%'}
               OR description ILIKE ${'%'+search+'%'})
        ORDER BY created_at DESC`
    } else if (catArray.length > 0) {
      rows = await sql`
        SELECT * FROM recipes
        WHERE categories && ${catArray}
        ORDER BY created_at DESC`
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

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const r = await req.json()
    const [row] = await sql`
      INSERT INTO recipes
        (title, title_en, description, description_en, source_url, thumbnail,
         platform, source_type, time_minutes, difficulty, servings, categories,
         tags, ingredients, steps, is_manual, calories, protein, fat, carbs)
      VALUES
        (${r.title}, ${r.title_en||null}, ${r.description||null}, ${r.description_en||null},
         ${r.source_url||null}, ${r.thumbnail||null}, ${r.platform||'website'},
         ${r.source_type||'website'}, ${r.time_minutes||null}, ${r.difficulty||null},
         ${r.servings||null}, ${r.categories||[]},
         ${r.tags||[]}, ${r.ingredients||[]}, ${r.steps||[]}, ${r.is_manual||false},
         ${r.calories||null}, ${r.protein||null}, ${r.fat||null}, ${r.carbs||null})
      RETURNING *`
    return new Response(JSON.stringify(row), {
      status: 201, headers: { 'Content-Type': 'application/json' }
    })
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
    const r = await req.json()
    const [row] = await sql`
      UPDATE recipes SET
        title          = ${r.title},
        title_en       = ${r.title_en||null},
        description    = ${r.description||null},
        description_en = ${r.description_en||null},
        source_url     = ${r.source_url||null},
        thumbnail      = ${r.thumbnail||null},
        time_minutes   = ${r.time_minutes||null},
        difficulty     = ${r.difficulty||null},
        servings       = ${r.servings||null},
        categories     = ${r.categories||[]},
        tags           = ${r.tags||[]},
        ingredients    = ${r.ingredients||[]},
        steps          = ${r.steps||[]},
        calories       = ${r.calories||null},
        protein        = ${r.protein||null},
        fat            = ${r.fat||null},
        carbs          = ${r.carbs||null}
      WHERE id = ${id}
      RETURNING *`
    return new Response(JSON.stringify(row), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const id  = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 })
    await sql`DELETE FROM recipes WHERE id = ${id}`
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
}
