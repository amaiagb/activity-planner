alter table public.user_resources add column if not exists is_favorite boolean not null default false;
