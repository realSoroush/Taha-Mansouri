-- Run once in Supabase SQL Editor before deploying the new form. Safe to rerun.
-- Consultation data remains separate and unchanged.
begin;

create table if not exists public.course_waitlist (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null unique check (phone ~ '^\+989[0-9]{9}$'),
  created_at timestamptz not null default now(),
  consent_at timestamptz not null default now(),
  consent_version text not null default 'course-launch-v1' check (consent_version = 'course-launch-v1'),
  source text not null default 'first-course-launch' check (source = 'first-course-launch'),
  status text not null default 'awaiting' check (status in ('awaiting', 'notified', 'unsubscribed'))
);

alter table public.course_waitlist enable row level security;
revoke all on table public.course_waitlist from public, anon, authenticated;
grant all on table public.course_waitlist to service_role;

create or replace function public.submit_course_waitlist(
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
  if char_length(v_name) not between 2 and 100 or v_name !~ '[[:alpha:]]'
    or v_name ~ '[[:cntrl:]]' or v_phone !~ '^\+989[0-9]{9}$' then
    raise exception 'Invalid input' using errcode = '22023';
  end if;
  -- Atomic uniqueness handles both concurrent phones and retry UUIDs. Never
  -- overwrite earlier details/consent or re-subscribe an unsubscribed number.
  insert into public.course_waitlist (request_id, full_name, phone)
  values (p_request_id, v_name, v_phone)
  on conflict do nothing;
  -- Do not expose whether a phone number was already on the list.
  return jsonb_build_object('accepted', true);
end;
$$;

revoke all on function public.submit_course_waitlist(text,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_course_waitlist(text,text,uuid,text)
  to anon, authenticated;
notify pgrst, 'reload schema';
commit;
