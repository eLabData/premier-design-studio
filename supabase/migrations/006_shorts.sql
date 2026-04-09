create table shorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references ai_jobs(id) on delete set null,
  title text not null default 'Untitled',
  script text,
  language text not null check (language in ('pt-br', 'en')),
  format text not null default 'short' check (format in ('short', 'normal')),
  visual_mode text not null check (visual_mode in ('images', 'video_ai', 'hybrid')),
  tts_provider text not null check (tts_provider in ('fal_ai', 'elevenlabs', 'openai')),
  caption_style text default 'bold',
  narration_url text,
  scenes jsonb default '[]',
  video_url text,
  thumbnail_url text,
  captions jsonb default '[]',
  platform_metadata jsonb default '{}',
  cost_usd numeric(10,6) default 0,
  cost_breakdown jsonb default '{}',
  credits_charged integer default 0,
  status text default 'pending' check (status in (
    'pending', 'generating_script', 'generating_audio',
    'generating_visuals', 'composing', 'completed', 'failed'
  )),
  error_message text,
  file_size_mb numeric default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table shorts enable row level security;
create policy "Users can read own shorts" on shorts for select using (auth.uid() = user_id);
create policy "Users can delete own shorts" on shorts for delete using (auth.uid() = user_id);
create index idx_shorts_user on shorts(user_id, created_at desc);
create index idx_shorts_status on shorts(status);
