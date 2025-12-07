-- Migration: Allow users to insert their own profile row
-- Date: 2025-11-29
-- Author: Gemini Assistant

-- 1. Policy for INSERT
-- Check if policy exists to avoid errors (Postgres doesn't have IF NOT EXISTS for policies cleanly, 
-- so we usually just run CREATE. If it fails, it means it exists).
-- This allows an authenticated user to INSERT a row into 'profiles' 
-- ONLY IF the 'id' column matches their own User ID.

create policy "Users can insert their own profile"
on profiles for insert
with check ( auth.uid() = id );

-- 2. (Optional) Ensure UPDATE is also allowed
-- create policy "Users can update their own profile"
-- on profiles for update
-- using ( auth.uid() = id );
