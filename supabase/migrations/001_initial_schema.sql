-- Users/profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('video', 'post', 'carousel')),
  status text default 'draft' check (status in ('draft', 'rendering', 'ready', 'published')),
  platform text,
  canvas_width int,
  canvas_height int,
  duration numeric,
  fps int,
  data jsonb default '{}', -- stores tracks, captions, canvas JSON, etc
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects enable row level security;
create policy "Users can CRUD own projects" on projects for all using (auth.uid() = user_id);

-- Usage events (AI cost tracking)
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  session_id uuid,
  module text not null, -- 'transcription', 'analysis', 'broll_search', 'caption_gen', 'post_copy', 'video_render', 'logo_gen', 'mockup_gen', 'store_assets'
  model text, -- 'anthropic/claude-sonnet-4', 'openai/whisper-large-v3', etc
  provider text default 'openrouter', -- 'openrouter', 'openai_direct', 'pexels', 'local'
  input_tokens int default 0,
  output_tokens int default 0,
  cost numeric(10,6) default 0, -- USD
  duration_ms int default 0,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table usage_events enable row level security;
create policy "Users can read own usage" on usage_events for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on usage_events for insert with check (auth.uid() = user_id);

-- Processing sessions (per-video)
create table processing_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  video_duration_sec numeric,
  file_size_mb numeric,
  total_cost numeric(10,6) default 0,
  status text default 'processing' check (status in ('processing', 'completed', 'failed')),
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table processing_sessions enable row level security;
create policy "Users can CRUD own sessions" on processing_sessions for all using (auth.uid() = user_id);

-- Scheduled posts
create table scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  platforms text[] not null,
  scheduled_at timestamptz not null,
  status text default 'scheduled' check (status in ('scheduled', 'publishing', 'published', 'failed')),
  caption text,
  hashtags text[],
  published_urls jsonb default '{}',
  created_at timestamptz default now()
);

alter table scheduled_posts enable row level security;
create policy "Users can CRUD own scheduled posts" on scheduled_posts for all using (auth.uid() = user_id);

-- Create storage bucket for media
insert into storage.buckets (id, name, public) values ('media', 'media', true);
create policy "Users can upload own media" on storage.objects for insert with check (auth.uid()::text = (storage.foldername(name))[1] and bucket_id = 'media');
create policy "Anyone can read media" on storage.objects for select using (bucket_id = 'media');
create policy "Users can delete own media" on storage.objects for delete using (auth.uid()::text = (storage.foldername(name))[1] and bucket_id = 'media');

-- Indexes
create index idx_projects_user on projects(user_id);
create index idx_usage_events_user on usage_events(user_id);
create index idx_usage_events_session on usage_events(session_id);
create index idx_usage_events_module on usage_events(module);
create index idx_scheduled_posts_user on scheduled_posts(user_id);
create index idx_scheduled_posts_scheduled on scheduled_posts(scheduled_at);
