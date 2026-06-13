-- Add language preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language varchar(5) DEFAULT 'th';

-- Add comment
COMMENT ON COLUMN public.profiles.language IS 'User preferred language (th, en, zh)';
