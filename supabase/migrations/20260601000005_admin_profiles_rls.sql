-- Migration: Admin Profiles RLS
-- Description: เพิ่มสิทธิ์ให้ Admin และ Operator สามารถดูข้อมูล และให้ Admin อัปเดตข้อมูลผู้ใช้งานได้ทั้งหมด

-- 1. สร้าง Helper Functions (ถ้ายังไม่มี)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_flag boolean;
BEGIN
  SELECT (role = 'admin') INTO is_admin_flag FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(is_admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean AS $$
DECLARE
  is_op_flag boolean;
BEGIN
  SELECT (role IN ('operator', 'admin')) INTO is_op_flag FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(is_op_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. ตั้งค่า RLS สำหรับตาราง Profiles
DO $$
BEGIN
    -- สิทธิ์การดูข้อมูลสำหรับ Admin และ Operator
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins and Operators can view all profiles'
    ) THEN
        CREATE POLICY "Admins and Operators can view all profiles" 
        ON public.profiles FOR SELECT 
        USING (public.is_operator());
    END IF;

    -- สิทธิ์การแก้ไขข้อมูลสำหรับ Admin เท่านั้น
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" 
        ON public.profiles FOR UPDATE
        USING (public.is_admin());
    END IF;
END
$$;
