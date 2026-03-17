-- Runtime tables for Command Center V3.1
-- Run this on Supabase AFTER 002_media_engine_v1.sql

create table if not exists runtime_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  autonomous_mode boolean not null default true,
  operator_mode boolean not null default true,
  safe_mode boolean not null default true,
  daily_topic_target integer not null default 20,
  daily_brief_target integer not null default 10,
  daily_post_target integer not null default 30,
  schedule_horizon_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id)
);

create table if not exists runtime_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists runtime_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists runtime_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  severity text not null default 'info',
  category text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_runtime_jobs_workspace on runtime_jobs(workspace_id);
create index if not exists idx_runtime_jobs_status on runtime_jobs(status);
create index if not exists idx_runtime_logs_workspace on runtime_logs(workspace_id);
create index if not exists idx_runtime_alerts_workspace on runtime_alerts(workspace_id, is_resolved);
