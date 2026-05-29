-- Migration: Update Profiles for Membership & Personal Data

-- Add new columns for personal data (Astrology)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS birth_time TIME,
ADD COLUMN IF NOT EXISTS birth_location TEXT;

-- Add columns for membership tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ;

-- If 'role' is currently a TEXT or ENUM, we want to ensure 'operator' is supported.
-- Assuming 'role' is just a TEXT column based on usual setup, if it's an ENUM we'd need to ALTER TYPE.
-- But since it's commonly TEXT in standard starter templates:
-- UPDATE public.profiles SET role = 'member' WHERE role IS NULL;
