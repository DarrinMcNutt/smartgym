-- Create a public bucket for gym uploads (avatars and meal images)
insert into storage.buckets (id, name, public)
values ('gym_uploads', 'gym_uploads', true)
on conflict (id) do nothing;

-- Set up access policies for the 'gym_uploads' bucket
-- 1. Allow public access to read files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'gym_uploads' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated Users Upload"
on storage.objects for insert
with check (
  bucket_id = 'gym_uploads' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow users to update their own files
create policy "Users Update Own Objects"
on storage.objects for update
using (
  bucket_id = 'gym_uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
