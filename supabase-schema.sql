-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists recipes (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),

  -- Bilingual titles & descriptions
  title        text not null,
  title_en     text,
  description  text,
  description_en text,

  -- Source
  source_url   text,
  thumbnail    text,
  platform     text default 'website',
  source_type  text default 'website',  -- 'video' | 'website'

  -- Metadata
  time_minutes  int,
  difficulty    text,   -- 'easy' | 'medium' | 'hard'
  servings      text,
  category      text,   -- matches CATEGORIES keys
  tags          text[] default '{}',

  -- Full recipe content (optional)
  ingredients   text[] default '{}',
  steps         text[] default '{}',

  is_manual     boolean default false
);

-- Enable public read + insert + delete (no login required)
alter table recipes enable row level security;

create policy "Public read"   on recipes for select using (true);
create policy "Public insert" on recipes for insert with check (true);
create policy "Public delete" on recipes for delete using (true);

-- Index for faster search
create index if not exists recipes_category_idx on recipes(category);
create index if not exists recipes_created_at_idx on recipes(created_at desc);
