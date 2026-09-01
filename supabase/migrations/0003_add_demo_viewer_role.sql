-- Add demo_viewer role to app_role enum and update RLS policies for read-only viewer access.

alter type public.app_role add value if not exists 'demo_viewer';

create or replace function public.is_recoverflow_viewer()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'demo_viewer')
  );
$$;

grant execute on function public.is_recoverflow_viewer() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'merchant_profiles', 'merchant_policies', 'payment_events', 'recovery_cases',
    'policy_evaluations', 'diagnoses', 'recovery_actions', 'approval_requests',
    'webhook_receipts', 'audit_entries', 'evaluation_runs', 'evaluation_results'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admins_only', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_viewer_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_delete', table_name);

    execute format('create policy %I on public.%I for select to authenticated using (public.is_recoverflow_viewer())', table_name || '_viewer_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_recoverflow_admin())', table_name || '_admin_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_recoverflow_admin()) with check (public.is_recoverflow_admin())', table_name || '_admin_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_recoverflow_admin())', table_name || '_admin_delete', table_name);
  end loop;
end;
$$;
