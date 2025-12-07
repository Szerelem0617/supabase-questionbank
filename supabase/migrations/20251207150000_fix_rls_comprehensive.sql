-- Migration: Fix Storage and Profile RLS Policies
-- Date: 2025-12-07
-- Description: 
-- 1. Updates Storage RLS to use filename-based checks (more robust than owner column).
-- 2. Ensures Profiles table is readable by everyone (needed for fetching own profile and viewing others).

-- ==========================================
-- STORAGE POLICIES (Avatars)
-- ==========================================

-- Ensure the 'avatars' bucket exists and is public
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Drop existing policies to prevent conflicts/duplicates
drop policy if exists "Users can upload avatars" on storage.objects;
drop policy if exists "Users can update their avatars" on storage.objects;
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Avatar Insert Policy" on storage.objects;
drop policy if exists "Avatar Update Policy" on storage.objects;
drop policy if exists "Avatar Select Policy" on storage.objects;
drop policy if exists "Avatar Delete Policy" on storage.objects;

-- Policy: INSERT (Upload)
-- Allow authenticated users to upload files named "{uid}.extension"
create policy "Avatar Insert Policy"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  name like auth.uid() || '.%'
);

-- Policy: UPDATE (Overwrite)
-- Allow authenticated users to update their own files
create policy "Avatar Update Policy"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars' and
  name like auth.uid() || '.%'
);

-- Policy: SELECT (View)
-- Allow public access to all avatars
create policy "Avatar Select Policy"
on storage.objects for select
to public
using ( bucket_id = 'avatars' );

-- Policy: DELETE
-- Allow users to delete their own avatars
create policy "Avatar Delete Policy"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars' and
  name like auth.uid() || '.%'
);

-- ==========================================
-- PROFILE POLICIES (Public.Profiles)
-- ==========================================

-- Drop potentially conflicting policies
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- Policy: SELECT
-- Allow everyone to read profiles (needed for comments section, header, etc.)
create policy "Public profiles are viewable by everyone"
on profiles for select
to public
using ( true );

-- Policy: UPDATE
-- Allow users to update their own profile details
create policy "Users can update own profile"
on profiles for update
to authenticated
using ( auth.uid() = id );
