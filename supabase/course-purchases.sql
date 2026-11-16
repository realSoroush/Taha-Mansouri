begin;

create table if not exists public.course_orders (
  id uuid primary key,
  product_slug text not null,
  buyer_token_hash text not null check (buyer_token_hash ~ '^[0-9a-f]{64}$'),
  amount_rial integer not null check (amount_rial > 0),
  authority text unique,
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (paid_at is null or authority is not null)
);

alter table public.course_orders enable row level security;
revoke all on public.course_orders from public, anon, authenticated;
grant select, insert, update on public.course_orders to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-downloads', 'course-downloads', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false;

-- Guard this bucket even if an existing permissive storage policy matches it.
drop policy if exists course_downloads_server_only on storage.objects;
create policy course_downloads_server_only on storage.objects
as restrictive for all to anon, authenticated
using (bucket_id <> 'course-downloads')
with check (bucket_id <> 'course-downloads');

notify pgrst, 'reload schema';
commit;
