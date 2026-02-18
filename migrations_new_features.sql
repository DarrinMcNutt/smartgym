-- 1. Personal Records Table
create table if not exists public.personal_records (
  id uuid default gen_random_uuid() primary key,
  athlete_id uuid references auth.users(id) not null,
  exercise_name text not null,
  max_weight numeric not null,
  date_achieved date default timezone('utc'::text, now())::date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Personal Records
alter table public.personal_records enable row level security;

create policy "Athletes can view their own PRs"
  on public.personal_records for select
  using (auth.uid() = athlete_id);

create policy "Athletes can insert their own PRs"
  on public.personal_records for insert
  with check (auth.uid() = athlete_id);

create policy "Athletes can update their own PRs"
  on public.personal_records for update
  using (auth.uid() = athlete_id);
  
create policy "Coaches can view PRs of their athletes"
  on public.personal_records for select
  using (
    exists (
      select 1 from public.users u
      where u.id = public.personal_records.athlete_id
      and u.selected_coach_id = auth.uid()
    )
  );

-- 2. Workout Templates Table
create table if not exists public.workout_templates (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references auth.users(id) not null,
  title text not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Workout Templates
alter table public.workout_templates enable row level security;

create policy "Coaches can view their own templates"
  on public.workout_templates for select
  using (auth.uid() = coach_id);

create policy "Coaches can manage their own templates"
  on public.workout_templates for all
  using (auth.uid() = coach_id);

-- 3. Subscriptions Table (For Revenue Dashboard)
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  plan_type text not null, -- 'monthly', 'quarterly', 'yearly'
  amount numeric not null,
  start_date date not null,
  end_date date not null,
  status text check (status in ('active', 'expired', 'cancelled')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Subscriptions
alter table public.subscriptions enable row level security;

create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'ADMIN'
    )
  );

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Add indexes for performance
create index if not exists idx_personal_records_athlete on public.personal_records(athlete_id);
create index if not exists idx_workout_templates_coach on public.workout_templates(coach_id);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
