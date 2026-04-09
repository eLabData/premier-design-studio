-- AI jobs table for async fal.ai webhook processing
create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  request_id text not null unique,
  model text not null,
  module text not null check (module in ('image_edit', 'image_upscale', 'image_generate', 'video_generate')),
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  prompt text,
  input_url text,
  result_url text,
  result_width int,
  result_height int,
  cost_usd numeric(10,6) default 0,
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table ai_jobs enable row level security;
create policy "Users can read own jobs" on ai_jobs for select using (auth.uid() = user_id);

-- Fast webhook lookups by request_id
create index idx_ai_jobs_request_id on ai_jobs(request_id);

-- User job listing
create index idx_ai_jobs_user_id on ai_jobs(user_id, created_at desc);
