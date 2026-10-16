-- Optional checks after setup.sql. All test rows are rolled back.
begin;
set local role anon;

do $$
begin
  if has_table_privilege(current_user, 'public.consultation_requests', 'SELECT')
    or has_table_privilege(current_user, 'public.consultation_requests', 'INSERT')
    or has_table_privilege(current_user, 'public.consultation_requests', 'UPDATE')
    or has_table_privilege(current_user, 'public.consultation_requests', 'DELETE') then
    raise exception 'FAIL: anonymous table access';
  end if;
  begin
    perform * from public.consultation_requests;
    raise exception 'FAIL: anonymous SELECT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_consultation_request('کاربر تست', '123', gen_random_uuid(), '');
    raise exception 'FAIL: invalid phone accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_consultation_request(' ', '09900000000', gen_random_uuid(), '');
    raise exception 'FAIL: invalid name accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.submit_consultation_request('کاربر تست', '09900000000', gen_random_uuid(), 'bot');
    raise exception 'FAIL: honeypot accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Same UUID retry, then a different request UUID with the same phone.
select public.submit_consultation_request('  کاربر   آزمایشی  ', '۰۹۹۰۰۰۰۰۰۰۰', 'b87da8d0-f9a1-4cc0-9991-54a0d29d0241', '');
select public.submit_consultation_request('کاربر آزمایشی', '+989900000000', 'b87da8d0-f9a1-4cc0-9991-54a0d29d0241', '');
select public.submit_consultation_request('نام متفاوت', '00989900000000', 'b87da8d0-f9a1-4cc0-9991-54a0d29d0242', '');

reset role;
do $$
begin
  if (select count(*) from public.consultation_requests
      where request_id in ('b87da8d0-f9a1-4cc0-9991-54a0d29d0241', 'b87da8d0-f9a1-4cc0-9991-54a0d29d0242')) <> 1 then
    raise exception 'FAIL: retry or phone deduplication (or test phone already used recently)';
  end if;
  if not exists(select 1 from public.consultation_requests
    where request_id = 'b87da8d0-f9a1-4cc0-9991-54a0d29d0241'
      and phone = '+989900000000' and full_name = 'کاربر آزمایشی' and status = 'new') then
    raise exception 'FAIL: normalized row mismatch';
  end if;
end;
$$;
set local role authenticated;
do $$
begin
  begin
    perform * from public.consultation_requests;
    raise exception 'FAIL: authenticated SELECT allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
select 'PASS: validation, privacy, normalization, retries and phone cooldown' as result;
