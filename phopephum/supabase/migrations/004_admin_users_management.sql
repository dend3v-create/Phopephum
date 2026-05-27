-- 004_admin_users_management.sql
-- เพิ่มคอลัมน์สำหรับระบบอนุมัติสมาชิก Beta Testers

-- เพิ่มคอลัมน์สถานะการอนุมัติใน profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  is_approved BOOLEAN DEFAULT false;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  approved_by UUID REFERENCES profiles(id);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  approved_at TIMESTAMPTZ;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  notes TEXT;

-- อัปเดต Admin policy ให้แอดมินสามารถดูสมาชิกทั้งหมดได้
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- อัปเดต Admin policy ให้แอดมินแก้ไขสิทธิ์สมาชิกได้
CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
