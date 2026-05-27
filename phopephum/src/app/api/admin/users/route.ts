import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const runtime = 'edge'

// ─── GET /api/admin/users — ดึงรายการสมาชิกทั้งหมดสำหรับ Admin ─────────────

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()

    // ตรวจสอบ Authorization header (simple token check)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ดึงรายการ profiles ทั้งหมดพร้อมข้อมูล auth.users (email)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, birth_date, birth_time, plan, role, is_approved, approved_at, notes, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[/api/admin/users] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ดึง email จาก auth.users ผ่าน admin API
    const userIds = (profiles || []).map((p: any) => p.id)
    let emailMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (authData?.users) {
        authData.users.forEach((u: any) => {
          emailMap[u.id] = u.email || '-'
        })
      }
    }

    const enrichedProfiles = (profiles || []).map((p: any) => ({
      ...p,
      email: emailMap[p.id] || '-'
    }))

    return NextResponse.json({ success: true, users: enrichedProfiles })

  } catch (error) {
    console.error('[/api/admin/users] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
