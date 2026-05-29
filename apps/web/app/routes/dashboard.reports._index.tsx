import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "รายงาน — PhopePhum" },
];

const REPORT_LABELS: Record<string, string> = {
  general_prediction: "พยากรณ์ทั่วไป",
  life_overview:      "ภาพรวมชีวิต",
  career:             "การงาน",
  relationship:       "ความสัมพันธ์",
  health:             "สุขภาพ",
  wealth:             "การเงิน",
  daily_insight:      "Insight วันนี้",
  annual_forecast:    "พยากรณ์รายปี",
  horoscope:          "ดวงชะตา",
  numerology:         "ตัวเลขโชคชะตา",
  yearly:             "พยากรณ์รายปี",
  monthly:            "พยากรณ์รายเดือน",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  const { supabase } = createSupabaseClient(request, env);
  const { data: reports } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return json({ reports: reports ?? [] });
}

function extractText(content: unknown): string {
  let text = "";
  if (typeof content === "string") text = content;
  else if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") text = c.text;
    else if (typeof c.content === "string") text = c.content;
    else if (typeof c.summary === "string") text = c.summary;
  }
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export default function ReportsIndex() {
  const { reports } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-1">บันทึกแห่งชะตา</p>
          <h1 className="font-display text-2xl font-bold text-[#F8F6F1]">
            รายงานดวงชะตา
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1">
            บทวิเคราะห์ชีวิตเชิงลึกส่งตรงสู่มือคุณ
          </p>
        </div>
        <Link to="/dashboard/reports/new">
          <Button>+ สร้างรายงาน</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-3xl mb-4 text-[#C6A96B]">✦</p>
          <p className="text-[#F8F6F1] font-medium mb-2">ยังไม่มีรายงาน</p>
          <p className="text-[#94A3B8] text-sm mb-6">
            เริ่มต้นการเดินทางด้วยการสร้างรายงานดวงชะตาแรกของคุณ
          </p>
          <Link to="/dashboard/reports/new">
            <Button>สร้างรายงานแรก</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link key={r.id} to={`/dashboard/reports/${r.id}`}>
              <Card className="hover:border-[#C6A96B]/40 transition-all group cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[#F8F6F1] font-medium group-hover:text-[#D9BC82] transition-colors">
                      {REPORT_LABELS[r.report_type] ?? r.report_type}
                    </p>
                    <p className="text-[#94A3B8] text-sm mt-1 line-clamp-1">
                      {extractText(r.content).slice(0, 100)}…
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#94A3B8] text-xs">
                      {new Date(r.created_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                    <p className="text-[#C6A96B] text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      อ่านรายงาน →
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
