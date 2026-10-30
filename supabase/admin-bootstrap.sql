-- Provision this verified email only; signup metadata cannot grant admin access.
create or replace function public.provision_event_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'UPDATE' then
  if lower(old.email) = 'ksy31098046@gmail.com' and
     (lower(new.email) is distinct from 'ksy31098046@gmail.com' or new.email_confirmed_at is null) then
   delete from public.event_admins where user_id=new.id;
  end if;
 end if;
 if lower(new.email) = 'ksy31098046@gmail.com' and new.email_confirmed_at is not null then
  insert into public.event_admins(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.provision_event_admin() from public,anon,authenticated;
drop trigger if exists provision_pnu_event_admin on auth.users;
create trigger provision_pnu_event_admin
after insert or update of email,email_confirmed_at on auth.users
for each row execute function public.provision_event_admin();
insert into public.event_admins(user_id)
select id from auth.users where lower(email)='ksy31098046@gmail.com' and email_confirmed_at is not null
on conflict(user_id) do nothing;
select 'ADMIN_BOOTSTRAP_READY' as status;
