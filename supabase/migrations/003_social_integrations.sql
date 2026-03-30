-- Social media connected accounts
create table social_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  provider text not null, -- 'instagram', 'facebook', 'youtube', 'tiktok', 'x', 'linkedin', 'threads'
  provider_account_id text not null, -- user's ID on the platform
  account_name text, -- display name
  account_picture text, -- profile picture URL
  account_handle text, -- @username
  access_token text not null, -- encrypted
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  additional_settings jsonb default '{}',
  connected_at timestamptz default now(),
  disabled boolean default false,
  refresh_needed boolean default false,

  unique(user_id, provider, provider_account_id)
);

alter table social_integrations enable row level security;
create policy "Users can CRUD own integrations" on social_integrations for all using (auth.uid() = user_id);

create index idx_social_integrations_user on social_integrations(user_id);
create index idx_social_integrations_provider on social_integrations(provider);

-- Social posts (published/scheduled via our app)
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  integration_id uuid references social_integrations(id) on delete cascade not null,
  content text not null,
  media_urls text[], -- array of media URLs
  status text default 'queued' check (status in ('queued', 'publishing', 'published', 'failed', 'draft')),
  scheduled_at timestamptz,
  published_at timestamptz,
  published_url text, -- URL of the published post
  error_message text,
  provider_post_id text, -- ID of the post on the platform
  settings jsonb default '{}', -- provider-specific settings
  created_at timestamptz default now()
);

alter table social_posts enable row level security;
create policy "Users can CRUD own social posts" on social_posts for all using (auth.uid() = user_id);

create index idx_social_posts_user on social_posts(user_id);
create index idx_social_posts_status on social_posts(status);
create index idx_social_posts_scheduled on social_posts(scheduled_at);

-- OAuth state storage (temporary, for OAuth flow)
create table oauth_states (
  state text primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  provider text not null,
  code_verifier text,
  redirect_url text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '10 minutes')
);

-- Auto-cleanup expired states
create or replace function cleanup_expired_oauth_states()
returns trigger as $$
begin
  delete from oauth_states where expires_at < now();
  return new;
end;
$$ language plpgsql;

create trigger trg_cleanup_oauth_states
  after insert on oauth_states
  for each row execute function cleanup_expired_oauth_states();
