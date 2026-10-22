-- Edición de un campo por vez: no pisa cambios simultáneos en otros campos de la fila.
create or replace function public.gestion_set_row_field(
  p_id uuid,
  p_field text,
  p_value jsonb,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_row public.gestion_rows;
begin
  select data -> p_field into v_before from public.gestion_rows where id = p_id and deleted_at is null for update;
  if not found then
    return null;
  end if;
  update public.gestion_rows
    set data = case when p_value is null or p_value = 'null'::jsonb then data - p_field
                    else jsonb_set(data, array[p_field], p_value, true) end,
        updated_by = p_actor,
        updated_at = now()
    where id = p_id
    returning * into v_row;
  return jsonb_build_object('before', v_before, 'row', to_jsonb(v_row));
end;
$$;

revoke all on function public.gestion_set_row_field(uuid, text, jsonb, text) from public, anon, authenticated;

-- Participantes de eventos de la app Pasito (anotados y entradas canjeadas),
-- con el código asignado si el evento entrega códigos.
create or replace function public.gestion_pasito_event_attendees(p_event_ids uuid[])
returns table (
  pasito_event_id uuid,
  user_id uuid,
  display_name text,
  email text,
  credential_code text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with people as (
    select p.event_id, p.user_id, p.joined_at, null::uuid as inventory_id
      from public.partner_event_participants p
      where p.event_id = any (p_event_ids) and p.status = 'active'
    union all
    select e.event_id, e.user_id, coalesce(e.claimed_at, e.created_at), e.inventory_id
      from public.partner_event_ticket_entitlements e
      where e.event_id = any (p_event_ids) and e.status = 'active'
  ),
  dedup as (
    select distinct on (event_id, user_id) event_id, user_id, joined_at, inventory_id
      from people
      order by event_id, user_id, inventory_id nulls last, joined_at
  )
  select d.event_id, d.user_id, pr.display_name, u.email::text,
         case when i.credential_type = 'code' then i.credential_payload end,
         d.joined_at
    from dedup d
    left join public.profiles pr on pr.id = d.user_id
    left join auth.users u on u.id = d.user_id
    left join private.partner_event_ticket_inventory i on i.id = d.inventory_id;
$$;

revoke all on function public.gestion_pasito_event_attendees(uuid[]) from public, anon, authenticated;

alter table public.gestion_attendees add column if not exists app_code text;
create index if not exists gestion_attendees_app_code_idx on public.gestion_attendees (event_id, app_code) where app_code is not null;
