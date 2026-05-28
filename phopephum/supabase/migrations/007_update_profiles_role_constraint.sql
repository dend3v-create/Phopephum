-- Migration: Update profiles_role_check constraint to allow 'operator' role
-- Description: Drop the existing constraint and recreate it including 'operator'

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'operator'));
