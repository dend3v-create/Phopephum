import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client (อ่าน/เขียน ด้วย user session)
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  const cookieStore = await cookies()
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll ถูกเรียกจาก Server Component — ไม่ต้องทำอะไร
          }
        },
      },
    }
  )
}

// Admin client (service_role — ใช้เฉพาะใน server-side route handlers)
export function createAdminClient() {
  const { createClient } = require('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
  return createClient(
    url,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
