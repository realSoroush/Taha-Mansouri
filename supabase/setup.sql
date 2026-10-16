-- Run the entire file in your project's Supabase SQL Editor.
-- Public media, private consultation requests; no login needed to submit.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 104857600, array['video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Upload only through the authenticated Dashboard. No public upload policy.

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (phone ~ '^\+989[0-9]{9}$'),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  source text not null default 'landing-page' check (source = 'landing-page')
);
create index if not exists consultation_requests_phone_created_idx
  on public.consultation_requests (phone, created_at desc);

alter table public.consultation_requests enable row level security;
revoke all on table public.consultation_requests from public, anon, authenticated;
-- No public SELECT, INSERT, UPDATE or DELETE policy. Only the narrow RPC below.
grant all on table public.consultation_requests to service_role;

create or replace function public.submit_consultation_request(
  p_full_name text, p_phone text, p_request_id uuid, p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  v_name text;
  v_phone text;
begin
  -- A honeypot is only a basic spam filter, not verified identity or CAPTCHA.
  if coalesce(p_website, '') <> '' then
    raise exception 'Invalid submission' using errcode = '22023';
  end if;
  if p_request_id is null or p_full_name is null or p_phone is null
    or char_length(p_full_name) > 200 or char_length(p_phone) > 40 then
    raise exception 'Invalid input' using errcode = '22023';
  end if;
  v_name := btrim(regexp_replace(p_full_name, '[[:space:]]+', ' ', 'g'));
  v_phone := translate(p_phone, '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789');
  v_phone := regexp_replace(v_phone, '[[:space:]()\-]', '', 'g');
  if v_phone ~ '^09[0-9]{9}$' then v_phone := '+98' || substring(v_phone from 2);
  elsif v_phone ~ '^00989[0-9]{9}$' then v_phone := '+' || substring(v_phone from 3);
  elsif v_phone ~ '^989[0-9]{9}$' then v_phone := '+' || v_phone;
  end if;
  if char_length(v_name) not between 2 and 100
    or v_name ~ '[[:cntrl:]]' or v_phone !~ '^\+989[0-9]{9}$' then
    raise exception 'Invalid input' using errcode = '22023';
  end if;

  -- Serialize by phone so simultaneous submissions cannot bypass the cooldown.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_phone, 0));
  if not exists (
    select 1 from public.consultation_requests
    where phone = v_phone and created_at > now() - interval '10 minutes'
  ) then
    insert into public.consultation_requests (request_id, full_name, phone)
    values (p_request_id, v_name, v_phone)
    on conflict (request_id) do nothing;
  end if;
  -- Same response for new, repeated and retried requests; no lead data exposed.
  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.submit_consultation_request(text,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_consultation_request(text,text,uuid,text)
  to anon, authenticated;
notify pgrst, 'reload schema';
commit;
