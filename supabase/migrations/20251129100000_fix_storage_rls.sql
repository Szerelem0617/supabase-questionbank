-- Migration: Fix Storage RLS Policies
-- Simplify policies to use 'owner' checking instead of filename parsing
-- Date: 2025-11-29

-- 1. Drop existing complex policies (ignore error if not exists)
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;

-- 2. Create standard Owner-based INSERT policy
create policy "Users can upload avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  auth.uid() = owner
);

-- 3. Create standard Owner-based UPDATE policy
create policy "Users can update their avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars' and
  auth.uid() = owner
);
