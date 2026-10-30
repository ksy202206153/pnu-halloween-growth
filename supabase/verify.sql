-- Run in SQL editor. All verification writes are rolled back.
begin;
do $$
declare event_uuid uuid := gen_random_uuid(); session_uuid uuid := gen_random_uuid(); registration_uuid uuid := gen_random_uuid(); payload jsonb;
begin
 payload := jsonb_build_array(jsonb_build_object('id',event_uuid,'event_id','pnu-halloween-2026','visitor_id',gen_random_uuid(),'session_id',session_uuid,'name','page_view','path','/__verification__','utm_source','verification'));
 perform public.collect_events(payload);
 perform public.collect_events(payload);
 if (select count(*) from public.growth_events where id=event_uuid)<>1 then raise exception 'Event deduplication failed'; end if;
 perform public.register_interest('pnu-halloween-2026',registration_uuid);
 perform public.register_interest('pnu-halloween-2026',registration_uuid);
 if (select count(*) from public.event_interests where id=registration_uuid)<>1 then raise exception 'Interest deduplication failed'; end if;
 if exists(select 1 from pg_tables where schemaname='public' and tablename in ('growth_events','event_interests','event_admins','verified_purchases') and not rowsecurity) then raise exception 'RLS not enabled'; end if;
end $$;
rollback;
select 'PASS: event writes, interest writes, deduplication and RLS. Test writes rolled back.' as verification;
