/**
 * yam-library.server.ts — Query ดวงยามสำเร็จ 112 ผัง จาก Supabase
 * Public read (anon key) — ใช้ใน loader
 */
import { createClient } from "@supabase/supabase-js";
import type { Env } from "~/env.server";

export interface YamLibraryRow {
  id: string;
  weekday: string;
  weekday_num: number;
  weekday_name_th: string;
  period: "day" | "night";
  yam_no: number;
  start_time: string;
  end_time: string;
  grade: "A" | "B" | "C" | "D" | "F";
  overall_score: number;
  lagna_zodiac_name: string | null;
  interp_finance: string | null;
  interp_work: string | null;
  interp_love: string | null;
  interp_health: string | null;
  interp_law: string | null;
}

export async function getYamLibrary(env: Env): Promise<YamLibraryRow[]> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("success_yam_charts")
    .select(
      "id,weekday,weekday_num,weekday_name_th,period,yam_no,start_time,end_time,grade,overall_score,lagna_zodiac_name,interp_finance,interp_work,interp_love,interp_health,interp_law"
    )
    .order("weekday_num", { ascending: true })
    .order("period",      { ascending: true })  // day before night
    .order("yam_no",      { ascending: true });

  if (error) {
    console.error("getYamLibrary error:", error.message);
    return [];
  }

  return (data ?? []) as YamLibraryRow[];
}
