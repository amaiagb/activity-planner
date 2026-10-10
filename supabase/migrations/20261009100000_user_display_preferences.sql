alter table public.profiles
  add column if not exists language text not null default 'en'
    check (language in ('en', 'es')),
  add column if not exists theme text not null default 'system'
    check (theme in ('system', 'light', 'dark'));
