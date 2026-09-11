import type { Env } from "~/env.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { getPersonLimit } from "~/services/permissions.server";

export interface ActiveSubjectData {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  isCustomer: boolean;
  customer?: any | null;
}

export interface SubjectContextResult {
  activeSubject: ActiveSubjectData;
  customers: any[];
  personLimit: number | null;
  currentCustomerCount: number;
  hasReachedLimit: boolean;
}

export function parseActiveSubjectCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/phopephum_active_subject=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function createActiveSubjectCookieHeader(subjectId: string | null): string {
  if (!subjectId || subjectId === "self") {
    return "phopephum_active_subject=; Path=/; Max-Age=0; SameSite=Lax";
  }
  // Max-age 30 days
  return `phopephum_active_subject=${encodeURIComponent(subjectId)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export async function resolveActiveSubject(
  request: Request,
  env: Env,
  user: { id: string },
  profile: any
): Promise<SubjectContextResult> {
  const { supabase } = createSupabaseClient(request, env);

  const url = new URL(request.url);
  const paramCustomerId = url.searchParams.get("customerId");
  const cookieCustomerId = parseActiveSubjectCookie(request);

  const targetCustomerId = paramCustomerId || cookieCustomerId;

  // ดึงรายชื่อ customers ของผู้ใช้นี้
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const customerList = customers || [];
  const personLimit = getPersonLimit(profile);
  const currentCustomerCount = customerList.length;
  const hasReachedLimit = personLimit !== null && currentCustomerCount >= personLimit;

  let selectedCustomer: any = null;
  if (targetCustomerId && targetCustomerId !== "self") {
    selectedCustomer = customerList.find(c => c.id === targetCustomerId);
  }

  if (selectedCustomer && selectedCustomer.birth_date) {
    return {
      activeSubject: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        birthDate: selectedCustomer.birth_date,
        birthTime: selectedCustomer.birth_time || "12:00",
        birthPlace: selectedCustomer.birth_place || "กรุงเทพมหานคร",
        isCustomer: true,
        customer: selectedCustomer,
      },
      customers: customerList,
      personLimit,
      currentCustomerCount,
      hasReachedLimit,
    };
  }

  // คืนค่าโปรไฟล์เจ้าของบัญชี
  return {
    activeSubject: {
      id: user.id,
      name: profile?.display_name || "ฉัน (เจ้าของบัญชี)",
      birthDate: profile?.birth_date || "1994-04-17",
      birthTime: profile?.birth_time || "12:00",
      birthPlace: profile?.birth_place || "กรุงเทพมหานคร",
      isCustomer: false,
      customer: null,
    },
    customers: customerList,
    personLimit,
    currentCustomerCount,
    hasReachedLimit,
  };
}
