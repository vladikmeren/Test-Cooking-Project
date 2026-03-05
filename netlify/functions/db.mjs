// Shared DB helper for all Netlify functions
import { neon } from '@neondatabase/serverless'

export function getDb() {
  const url = process.env.NETLIFY_DATABASE_URL
  if (!url) throw new Error('NETLIFY_DATABASE_URL not set')
  return neon(url)
}

// Create table if not exists (runs on first request)
export async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS recipes (
      id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      title        TEXT NOT NULL,
      title_en     TEXT,
      description  TEXT,
      description_en TEXT,
      source_url   TEXT,
      thumbnail    TEXT,
      platform     TEXT DEFAULT 'website',
      source_type  TEXT DEFAULT 'website',
      time_minutes INT,
      difficulty   TEXT,
      servings     TEXT,
      category     TEXT,
      tags         TEXT[] DEFAULT '{}',
      ingredients  TEXT[] DEFAULT '{}',
      steps        TEXT[] DEFAULT '{}',
      is_manual    BOOLEAN DEFAULT FALSE
    )
  `
}
