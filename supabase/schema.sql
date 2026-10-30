-- Apply once with Supabase MCP apply_migration or the SQL editor.
create table if not exists public.event_admins(user_id uuid primary key references auth.users(id));
create table if not exists public.growth_events(
 id uuid primary key, event_id text not null, visitor_id uuid not null, session_id uuid not null,
 name text not null check(name in ('page_view','event_view','registration_start','registration_complete','button_click','share_complete')),
 button text, path text, utm_source text, utm_medium text, utm_campaign text,
 created_at timestamptz not null default now()
);
create index if not exists growth_event_time on public.growth_events(event_id,created_at,session_id);
create table if not exists public.event_interests(id uuid primary key,event_id text not null,created_at timestamptz not null default now());
create table if not exists public.verified_purchases(
 order_id text primary key,event_id text not null,session_id uuid not null,
 amount integer not null check(amount>=0),created_at timestamptz not null default now()
);
alter table public.event_admins enable row level security;
alter table public.growth_events enable row level security;
alter table public.event_interests enable row level security;
alter table public.verified_purchases enable row level security;
-- No direct client table access. Purchase writes are server/service_role only.
revoke all on public.event_admins,public.growth_events,public.event_interests,public.verified_purchases from anon,authenticated;

create or replace function public.collect_events(p_events jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_events is null or jsonb_typeof(p_events)<>'array' then raise exception 'Invalid batch'; end if;
 if jsonb_array_length(p_events)>50 then raise exception 'Invalid batch'; end if;
 if exists(select 1 from jsonb_array_elements(p_events) x where (x->>'event_id') is distinct from 'pnu-halloween-2026') then raise exception 'Unknown event'; end if;
 insert into public.growth_events(id,event_id,visitor_id,session_id,name,button,path,utm_source,utm_medium,utm_campaign)
 select (x->>'id')::uuid,left(x->>'event_id',80),(x->>'visitor_id')::uuid,(x->>'session_id')::uuid,x->>'name',left(x->>'button',80),left(x->>'path',200),left(x->>'utm_source',80),left(x->>'utm_medium',80),left(x->>'utm_campaign',80)
 from jsonb_array_elements(p_events) x on conflict(id) do nothing;
 return '{"ok":true}'::jsonb;
end $$;
create or replace function public.register_interest(p_event_id text,p_registration_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_event_id<>'pnu-halloween-2026' then raise exception 'Unknown event'; end if;
 insert into public.event_interests(id,event_id) values(p_registration_id,p_event_id) on conflict(id) do nothing;
 return '{"ok":true}'::jsonb;
end $$;

create or replace function public.analytics_report(p_event_id text,p_days integer default 30) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.event_admins where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 if p_days not between 1 and 90 then raise exception 'Invalid range'; end if;
 with e as(select * from public.growth_events where event_id=p_event_id and created_at>=now()-make_interval(days=>p_days)),
 a as(select session_id,min(created_at) t from e where name='page_view' group by session_id),
 b as(select e.session_id,min(e.created_at) t from e join a on a.session_id=e.session_id and e.created_at>=a.t where e.name='event_view' group by e.session_id),
 c as(select e.session_id,min(e.created_at) t from e join b on b.session_id=e.session_id and e.created_at>=b.t where e.name='registration_start' group by e.session_id),
 d as(select e.session_id,min(e.created_at) t from e join c on c.session_id=e.session_id and e.created_at>=c.t where e.name='registration_complete' group by e.session_id),
 p as(select * from public.verified_purchases where event_id=p_event_id and created_at>=now()-make_interval(days=>p_days)),
 first_source as(select distinct on(session_id) session_id,utm_source,utm_medium,utm_campaign from e where name='page_view' order by session_id,created_at)
 select jsonb_build_object(
 'funnel',jsonb_build_array(jsonb_build_object('label','페이지 방문','sessions',(select count(*) from a)),jsonb_build_object('label','참여 안내 확인','sessions',(select count(*) from b)),jsonb_build_object('label','관심 등록 시작','sessions',(select count(*) from c)),jsonb_build_object('label','관심 등록 완료','sessions',(select count(*) from d))),
 'registrations',(select count(*) from public.event_interests where event_id=p_event_id and created_at>=now()-make_interval(days=>p_days)),
 'conversion_rate',coalesce(round(100.0*(select count(distinct p.session_id) from p join a on a.session_id=p.session_id and p.created_at>=a.t)/nullif((select count(*) from a),0),2),0),
 'revenue',coalesce((select sum(amount) from p),0),
 'clicks',coalesce((select jsonb_agg(q order by clicks desc) from(select button,count(*) clicks,count(distinct session_id) sessions from e where name='button_click' group by button) q),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(q order by sessions desc) from(select utm_source source,utm_medium medium,utm_campaign campaign,count(*) sessions from first_source group by utm_source,utm_medium,utm_campaign)q),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.collect_events(jsonb),public.register_interest(text,uuid),public.analytics_report(text,integer) from public;
grant execute on function public.collect_events(jsonb),public.register_interest(text,uuid) to anon,authenticated;
grant execute on function public.analytics_report(text,integer) to authenticated;
