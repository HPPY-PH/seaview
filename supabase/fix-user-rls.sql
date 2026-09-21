-- Fix recursive RLS policies on public."User".
-- Run this once in the Supabase SQL Editor.

-- Use a security-definer helper so the admin check does not recursively invoke User RLS.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."User"
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin_user() to authenticated;

-- Replace every existing User policy so no policy directly queries User
-- through the same RLS-protected table.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'User'
  loop
    execute format('drop policy if exists %I on public."User"', policy_record.policyname);
  end loop;
end
$$;

create policy "Users can read their own profile"
on public."User"
for select
to authenticated
using (auth.uid() = id or public.is_admin_user());

create policy "Users can create their own profile"
on public."User"
for insert
to authenticated
with check (auth.uid() = id or public.is_admin_user());

create policy "Users can update their own profile"
on public."User"
for update
to authenticated
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

create policy "Admins can delete member profiles"
on public."User"
for delete
to authenticated
using (public.is_admin_user());
