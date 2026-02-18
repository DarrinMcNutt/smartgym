-- Gym Access Code System (Run this in Supabase SQL Editor)
-- ==========================================================

-- 1. Create the table for storing unique access codes
create table if not exists public.gym_access_codes (
  code text primary key,
  is_used boolean default false,
  used_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used_at timestamp with time zone
);

-- 2. Add Row Level Security (RLS)
alter table public.gym_access_codes enable row level security;

-- Role Check Helpers (Optional, depending on your schema)
-- We assume "profiles" table has a "role" column with 'ADMIN' or 'ATHLETE'

-- 3. Policy: Admins have full access to manage codes
create policy "Admins can do everything with access codes" 
  on public.gym_access_codes
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
      and role = 'ADMIN'
    )
  );

-- 4. Policy: Athletes can check if a code exists and is unused during registration
create policy "Athletes can read unused codes for validation" 
  on public.gym_access_codes
  for select 
  using (not is_used);

-- 5. Function to claim an access code securely
create or replace function public.claim_gym_access_code(target_code text)
returns void as $$
begin
  update public.gym_access_codes
  set is_used = true,
      used_by = auth.uid()
  where code = target_code
    and is_used = false;
end;
$$ language plpgsql security definer;
