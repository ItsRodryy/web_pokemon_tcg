-- Ejecutar en el SQL Editor del proyecto exclusivo web_pokemon_tcg.
-- No modifica tablas de otros proyectos ni elimina datos existentes.
begin;

create table if not exists public.tcg_admin_emails (
  email text primary key check (email = lower(email))
);
alter table public.tcg_admin_emails enable row level security;
revoke all on public.tcg_admin_emails from anon, authenticated;
insert into public.tcg_admin_emails(email) values ('adrianrodry55@gmail.com') on conflict do nothing;

create or replace function public.tcg_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tcg_admin_emails a
    join auth.identities i on lower(i.identity_data->>'email') = a.email
    where i.user_id = (select auth.uid()) and i.provider = 'google'
      and i.identity_data->>'email_verified' = 'true'
  );
$$;
revoke all on function public.tcg_is_admin() from public;
grant execute on function public.tcg_is_admin() to authenticated;

create table if not exists public.tcg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(btrim(username)) between 1 and 40),
  updated_at timestamptz not null default now()
);
alter table public.tcg_profiles enable row level security;
revoke all on public.tcg_profiles from anon, authenticated;
grant select, insert, update on public.tcg_profiles to authenticated;
drop policy if exists tcg_profile_read on public.tcg_profiles;
create policy tcg_profile_read on public.tcg_profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists tcg_profile_create on public.tcg_profiles;
create policy tcg_profile_create on public.tcg_profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists tcg_profile_update on public.tcg_profiles;
create policy tcg_profile_update on public.tcg_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create table if not exists public.tcg_cards (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  datos jsonb not null check (
    jsonb_typeof(datos) = 'object'
    and datos ?& array['id','idioma','nombre','cantidad','imagen','codigo','numero','variante']
    and jsonb_typeof(datos->'id') = 'string'
    and jsonb_typeof(datos->'idioma') = 'string'
    and jsonb_typeof(datos->'nombre') = 'string'
    and jsonb_typeof(datos->'imagen') = 'string'
    and jsonb_typeof(datos->'codigo') = 'string'
    and jsonb_typeof(datos->'numero') = 'string'
    and jsonb_typeof(datos->'variante') = 'string'
    and datos->>'id' = id
    and datos->>'idioma' in ('japones','español','coreano')
    and char_length(btrim(datos->>'nombre')) between 1 and 120
    and jsonb_typeof(datos->'cantidad') = 'number'
    and (datos->>'cantidad')::numeric between 1 and 9999
    and mod((datos->>'cantidad')::numeric, 1) = 0
    and char_length(datos->>'imagen') between 1 and 2000
  ),
  updated_at timestamptz not null default now()
);
create unique index if not exists tcg_card_identity on public.tcg_cards (
  lower(btrim(datos->>'idioma')), lower(btrim(datos->>'codigo')),
  lower(btrim(datos->>'numero')), lower(btrim(datos->>'variante'))
) where coalesce(datos->>'codigo','') <> '' and coalesce(datos->>'numero','') <> 'pendiente';
alter table public.tcg_cards enable row level security;
revoke all on public.tcg_cards from anon, authenticated;
grant select on public.tcg_cards to anon, authenticated;
grant insert, update on public.tcg_cards to authenticated;
drop policy if exists tcg_cards_read on public.tcg_cards;
create policy tcg_cards_read on public.tcg_cards for select to anon, authenticated using (true);
drop policy if exists tcg_cards_create on public.tcg_cards;
create policy tcg_cards_create on public.tcg_cards for insert to authenticated with check ((select public.tcg_is_admin()));
drop policy if exists tcg_cards_update on public.tcg_cards;
create policy tcg_cards_update on public.tcg_cards for update to authenticated using ((select public.tcg_is_admin())) with check ((select public.tcg_is_admin()));

create or replace function public.tcg_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists tcg_profile_timestamp on public.tcg_profiles;
create trigger tcg_profile_timestamp before update on public.tcg_profiles for each row execute function public.tcg_touch_updated_at();
drop trigger if exists tcg_card_timestamp on public.tcg_cards;
create trigger tcg_card_timestamp before update on public.tcg_cards for each row execute function public.tcg_touch_updated_at();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes_cartas','imagenes_cartas',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists tcg_photo_read on storage.objects;
create policy tcg_photo_read on storage.objects for select to anon, authenticated using (bucket_id = 'imagenes_cartas');
drop policy if exists tcg_photo_create on storage.objects;
create policy tcg_photo_create on storage.objects for insert to authenticated
with check (bucket_id = 'imagenes_cartas' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.tcg_is_admin()));
drop policy if exists tcg_photo_delete on storage.objects;
create policy tcg_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'imagenes_cartas' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.tcg_is_admin()));
commit;
