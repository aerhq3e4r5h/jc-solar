-- Helpers shared by the database tests (one psql session runs them all).

\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Act as a given user (null = anonymous visitor).
create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
  perform set_config('request.jwt.claim.role', case when p_user is null then 'anon' else 'authenticated' end, false);
  if p_user is null then
    execute 'set role anon';
  else
    execute 'set role authenticated';
  end if;
end;
$$;

create or replace function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.role', 'service_role', false);
  execute 'set role service_role';
end;
$$;

-- Expect a statement to fail with an error matching p_expected (regex).
create or replace function pg_temp.expect_error(p_sql text, p_label text, p_expected text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (statement succeeded but should not have)', p_label;
exception
  when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlerrm !~* p_expected then
      raise exception 'FAIL: % failed for the wrong reason: %', p_label, sqlerrm;
    end if;
end;
$$;

