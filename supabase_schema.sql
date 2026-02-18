-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create a table for public profiles linked to auth.users
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  name text,
  role text default 'ATHLETE' check (role in ('ATHLETE', 'COACH', 'ADMIN')),
  avatar_url text,
  gym_code text,
  streak integer default 0,
  points integer default 0,
  selected_coach_id text,
  bio text
);

-- Enable RLS
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Create a table for workouts
create table workouts (
  id uuid default uuid_generate_v4() primary key,
  athlete_id uuid references profiles(id),
  date date not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create a table for workout exercises
create table workout_exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references workouts(id),
  exercise_name text not null,
  sets integer,
  reps integer,
  weight float,
  completed boolean default false
);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, gym_code, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce(new.raw_user_meta_data->>'role', 'ATHLETE'),
    new.raw_user_meta_data->>'gym_code',
    'https://i.pravatar.cc/150?u=' || new.id
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for messages
create table messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  text text,
  image_url text,
  audio_url text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for messages
alter table messages enable row level security;

create policy "Users can see their own messages." on messages for select 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert their own messages." on messages for insert 
  with check (auth.uid() = sender_id);

create policy "Users can update their own received messages." on messages for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Function to claim an access code securely
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
