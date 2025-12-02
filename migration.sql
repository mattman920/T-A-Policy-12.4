-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Create organizations table
create table if not exists organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create organization_members table
create table if not exists organization_members (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'manager', 'member')) default 'member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(organization_id, user_id)
);

-- 3. Add organization_id to existing tables
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'employees' and column_name = 'organization_id') then
    alter table employees add column organization_id uuid references organizations(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'violations' and column_name = 'organization_id') then
    alter table violations add column organization_id uuid references organizations(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'settings' and column_name = 'organization_id') then
    alter table settings add column organization_id uuid references organizations(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'issued_das' and column_name = 'organization_id') then
    alter table issued_das add column organization_id uuid references organizations(id);
  end if;
end $$;

-- 4. Data Migration: Create default organizations and link data
do $$
declare
  user_rec record;
  new_org_id uuid;
begin
  -- Loop through all unique users found in the data tables
  for user_rec in 
    select distinct user_id from settings where user_id is not null
    union select distinct user_id from employees where user_id is not null
    union select distinct user_id from violations where user_id is not null
  loop
    -- Check if user already has an organization (to avoid duplicates if run multiple times)
    if not exists (select 1 from organization_members where user_id = user_rec.user_id) then
      -- Create Organization
      insert into organizations (name) values ('Headquarters') returning id into new_org_id;

      -- Add User to Organization as Admin
      insert into organization_members (organization_id, user_id, role) values (new_org_id, user_rec.user_id, 'admin');

      -- Update Tables
      update employees set organization_id = new_org_id where user_id = user_rec.user_id and organization_id is null;
      update violations set organization_id = new_org_id where user_id = user_rec.user_id and organization_id is null;
      update settings set organization_id = new_org_id where user_id = user_rec.user_id and organization_id is null;
      update issued_das set organization_id = new_org_id where user_id = user_rec.user_id and organization_id is null;
    end if;
  end loop;
end $$;

-- 5. Enable RLS on new tables
alter table organizations enable row level security;
alter table organization_members enable row level security;

-- 6. Drop old policies (Cleanup)
drop policy if exists "Users can view their own employees" on employees;
drop policy if exists "Users can insert their own employees" on employees;
drop policy if exists "Users can update their own employees" on employees;
drop policy if exists "Users can delete their own employees" on employees;

drop policy if exists "Users can view their own violations" on violations;
drop policy if exists "Users can insert their own violations" on violations;
drop policy if exists "Users can update their own violations" on violations;
drop policy if exists "Users can delete their own violations" on violations;

drop policy if exists "Users can view their own settings" on settings;
drop policy if exists "Users can insert their own settings" on settings;
drop policy if exists "Users can update their own settings" on settings;

drop policy if exists "Users can view their own issued das" on issued_das;
drop policy if exists "Users can insert their own issued das" on issued_das;

-- 7. Create new policies

-- Organizations
create policy "Members can view their organization" on organizations
  for select using (
    auth.uid() in (select user_id from organization_members where organization_id = organizations.id)
  );

-- Organization Members
create policy "Users can view their own membership" on organization_members
  for select using (
    auth.uid() = user_id
  );

-- Employees
create policy "Org members can view employees" on employees
  for select using (
    exists (
      select 1 from organization_members
      where organization_id = employees.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can insert employees" on employees
  for insert with check (
    exists (
      select 1 from organization_members
      where organization_id = employees.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can update employees" on employees
  for update using (
    exists (
      select 1 from organization_members
      where organization_id = employees.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can delete employees" on employees
  for delete using (
    exists (
      select 1 from organization_members
      where organization_id = employees.organization_id
      and user_id = auth.uid()
    )
  );

-- Violations
create policy "Org members can view violations" on violations
  for select using (
    exists (
      select 1 from organization_members
      where organization_id = violations.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can insert violations" on violations
  for insert with check (
    exists (
      select 1 from organization_members
      where organization_id = violations.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can update violations" on violations
  for update using (
    exists (
      select 1 from organization_members
      where organization_id = violations.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can delete violations" on violations
  for delete using (
    exists (
      select 1 from organization_members
      where organization_id = violations.organization_id
      and user_id = auth.uid()
    )
  );

-- Settings
create policy "Org members can view settings" on settings
  for select using (
    exists (
      select 1 from organization_members
      where organization_id = settings.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can insert settings" on settings
  for insert with check (
    exists (
      select 1 from organization_members
      where organization_id = settings.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can update settings" on settings
  for update using (
    exists (
      select 1 from organization_members
      where organization_id = settings.organization_id
      and user_id = auth.uid()
    )
  );

-- Issued DAs
create policy "Org members can view issued_das" on issued_das
  for select using (
    exists (
      select 1 from organization_members
      where organization_id = issued_das.organization_id
      and user_id = auth.uid()
    )
  );

create policy "Org members can insert issued_das" on issued_das
  for insert with check (
    exists (
      select 1 from organization_members
      where organization_id = issued_das.organization_id
      and user_id = auth.uid()
    )
  );
