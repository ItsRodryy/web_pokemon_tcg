-- Ejecutar en el SQL Editor del proyecto exclusivo web_pokemon_tcg DESPUÉS de configurar_supabase.sql.
-- Solo añade (columnas, tabla y funciones); no borra datos y se puede ejecutar varias veces.
-- Abre la web a más personas: cada una guarda su colección (solo referencias a cartas existentes)
-- y puede aparecer en Descubrir. Sin subidas de fotos ni texto libre en las cartas.
begin;

-- Perfil: avatar predefinido (a1..a8), visibilidad elegida por la persona y ocultación por moderación.
alter table public.tcg_profiles add column if not exists avatar text not null default 'a1';
alter table public.tcg_profiles add column if not exists visible boolean not null default true;
alter table public.tcg_profiles add column if not exists oculto boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tcg_profiles_avatar_check') then
    alter table public.tcg_profiles add constraint tcg_profiles_avatar_check check (avatar ~ '^a[1-8]$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tcg_profiles_username_sin_enlaces') then
    alter table public.tcg_profiles add constraint tcg_profiles_username_sin_enlaces check (username !~* '(https?:|www\.|@)') not valid;
  end if;
end $$;
-- Cada persona cambia su nombre, avatar y visibilidad; "oculto" solo lo cambia el administrador.
revoke insert, update on public.tcg_profiles from authenticated;
grant insert (id, username, avatar, visible), update (username, avatar, visible) on public.tcg_profiles to authenticated;

-- Funciones auxiliares (nunca devuelven datos privados).
-- Las políticas de lectura pública la evalúan también para visitantes sin sesión (devuelve false).
grant execute on function public.tcg_is_admin() to anon;

create or replace function public.tcg_uid_es_admin(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tcg_admin_emails a
    join auth.identities i on lower(i.identity_data->>'email') = a.email
    where i.user_id = uid and i.provider = 'google' and i.identity_data->>'email_verified' = 'true'
  );
$$;
revoke all on function public.tcg_uid_es_admin(uuid) from public, anon, authenticated;

create or replace function public.tcg_perfil_visible(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tcg_profiles p where p.id = uid and p.visible and not p.oculto);
$$;
revoke all on function public.tcg_perfil_visible(uuid) from public;
grant execute on function public.tcg_perfil_visible(uuid) to anon, authenticated;

-- Colección de cada persona: solo referencias a cartas del índice (idioma + identificador).
create table if not exists public.tcg_user_cards (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idioma text not null check (idioma in ('japones', 'español', 'coreano')),
  catalogo_id text not null check (catalogo_id ~ '^[A-Za-z0-9:._+-]{1,80}$'),
  cantidad integer not null check (cantidad between 1 and 9999),
  tipo text check (tipo is null or tipo in ('Agua','Dragón','Fuego','Hada','Incolora','Lucha','Metálica','Oscura','Planta','Psíquico','Rayo','Entrenador','Energía')),
  categoria text check (categoria is null or categoria in ('Pokémon', 'Entrenador', 'Energía')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, idioma, catalogo_id)
);
alter table public.tcg_user_cards enable row level security;
revoke all on public.tcg_user_cards from anon, authenticated;
grant select on public.tcg_user_cards to anon, authenticated;
grant insert, delete on public.tcg_user_cards to authenticated;
-- PostgREST actualiza todas las columnas enviadas en un upsert; la política impide cambiar de propietario.
grant update (owner_id, idioma, catalogo_id, cantidad, tipo, categoria) on public.tcg_user_cards to authenticated;

drop policy if exists tcg_user_cards_read on public.tcg_user_cards;
create policy tcg_user_cards_read on public.tcg_user_cards for select to anon, authenticated
  using (owner_id = (select auth.uid()) or (select public.tcg_perfil_visible(owner_id)) or (select public.tcg_is_admin()));
drop policy if exists tcg_user_cards_insert on public.tcg_user_cards;
create policy tcg_user_cards_insert on public.tcg_user_cards for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists tcg_user_cards_update on public.tcg_user_cards;
create policy tcg_user_cards_update on public.tcg_user_cards for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists tcg_user_cards_delete on public.tcg_user_cards;
create policy tcg_user_cards_delete on public.tcg_user_cards for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Límite por persona para no agotar el plan gratuito.
create or replace function public.tcg_limite_cartas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Actualizar una carta que ya existe (upsert) no cuenta como carta nueva.
  if not exists (select 1 from public.tcg_user_cards where owner_id = new.owner_id and idioma = new.idioma and catalogo_id = new.catalogo_id)
     and (select count(*) from public.tcg_user_cards where owner_id = new.owner_id) >= 500 then
    raise exception 'Has alcanzado el límite de 500 cartas.' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists tcg_user_cards_limite on public.tcg_user_cards;
create trigger tcg_user_cards_limite before insert on public.tcg_user_cards for each row execute function public.tcg_limite_cartas();
drop trigger if exists tcg_user_cards_timestamp on public.tcg_user_cards;
create trigger tcg_user_cards_timestamp before update on public.tcg_user_cards for each row execute function public.tcg_touch_updated_at();

-- Descubrir: perfiles visibles con cartas. La colección del propietario sale de tcg_cards.
create or replace function public.tcg_descubrir()
returns table (id uuid, username text, avatar text, cartas integer, ejemplares integer, propietario boolean, oculto boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, t.username, t.avatar, t.n, t.u, t.propietario, t.oculto from (
    select p.id, p.username, p.avatar, c.n, c.u, false as propietario, p.oculto, c.ultima
    from public.tcg_profiles p
    join (select owner_id, count(*)::int as n, sum(cantidad)::int as u, max(updated_at) as ultima
          from public.tcg_user_cards group by owner_id) c on c.owner_id = p.id
    where p.visible and (not p.oculto or public.tcg_is_admin())
    union all
    select p.id, p.username, p.avatar, (select count(*)::int from public.tcg_cards),
           (select coalesce(sum((datos->>'cantidad')::int), 0)::int from public.tcg_cards), true, p.oculto, now()
    from public.tcg_profiles p
    where public.tcg_uid_es_admin(p.id) and p.visible and (not p.oculto or public.tcg_is_admin())
      and exists (select 1 from public.tcg_cards)
  ) t
  order by t.propietario desc, t.ultima desc
  limit 200;
$$;
revoke all on function public.tcg_descubrir() from public;
grant execute on function public.tcg_descubrir() to anon, authenticated;

-- Datos públicos de un perfil visible (para enlaces ?u=...).
create or replace function public.tcg_perfil_publico(uid uuid)
returns table (id uuid, username text, avatar text, propietario boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.avatar, public.tcg_uid_es_admin(p.id)
  from public.tcg_profiles p
  where p.id = uid and p.visible and (not p.oculto or public.tcg_is_admin() or p.id = (select auth.uid()));
$$;
revoke all on function public.tcg_perfil_publico(uuid) from public;
grant execute on function public.tcg_perfil_publico(uuid) to anon, authenticated;

-- Moderación: solo el administrador oculta o muestra un perfil.
create or replace function public.tcg_ocultar(uid uuid, ocultar boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tcg_is_admin() then raise exception 'Solo el administrador puede ocultar perfiles.' using errcode = '42501'; end if;
  update public.tcg_profiles set oculto = ocultar where id = uid;
end;
$$;
revoke all on function public.tcg_ocultar(uuid, boolean) from public;
grant execute on function public.tcg_ocultar(uuid, boolean) to authenticated;

-- Cada persona puede borrar su perfil y sus cartas (no toca la colección del propietario).
create or replace function public.tcg_borrar_mis_datos() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión.' using errcode = '42501'; end if;
  delete from public.tcg_user_cards where owner_id = (select auth.uid());
  delete from public.tcg_profiles where id = (select auth.uid());
end;
$$;
revoke all on function public.tcg_borrar_mis_datos() from public;
grant execute on function public.tcg_borrar_mis_datos() to authenticated;

commit;
