import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { AstralIcon } from "~/components/ui/AstralIcon";
import type { AstralIconName, AstralIconVariant } from "~/components/ui/AstralIcon";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "รายงาน — PhopePhum" },
];

interface ReportMeta {
  label: string;
  iconName: AstralIconName;
  variant: AstralIconVariant;
  iconBg: string;
}

const REPORT_META: Record<string, ReportMeta> = {
  general_prediction: {
    label: "พยากรณ์ปัญญาชีวิต (Therapy)",
    iconName: "wisdom",
    variant: "gold",
    iconBg: "bg-violet-500/20 border-violet-400/30 text-violet-300",
  },
  life_overview: {
    label: "โครงสร้างชีวิตเชิงลึก",
    iconName: "horanu",
    variant: "gold",
    iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
  },
  personal_branding: {
    label: "ตัวตน & อัตลักษณ์",
    iconName: "crown",
    variant: "amber",
    iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
  },
  career: {
    label: "ภารกิจ & ความสำเร็จ",
    iconName: "career",
    variant: "sky",
    iconBg: "bg-sky-500/20 border-sky-400/30 text-sky-300",
  },
  relationship: {
    label: "เสน่ห์ & ความสัมพันธ์",
    iconName: "relationship",
    variant: "rose",
    iconBg: "bg-rose-500/20 border-rose-400/30 text-rose-300",
  },
  health: {
    label: "สุขภาพ & พลังชีวิต",
    iconName: "wellness",
    variant: "emerald",
    iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
  },
  wealth: {
    label: "กระแสทรัพย์ & มั่งคั่ง",
    iconName: "finance",
    variant: "emerald",
    iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
  },
  daily_insight: {
    label: "ปัญญาญาณรายวัน",
    iconName: "spark",
    variant: "gold",
    iconBg: "bg-yellow-500/20 border-yellow-400/30 text-yellow-300",
  },
  annual_forecast: {
    label: "จังหวะชะตารายปี",
    iconName: "calendar",
    variant: "gold",
    iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300",
  },
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
          <div className="w-12 h-12 rounded-2xl bg-[#C6A96B]/10 border border-[#C6A96B]/30 flex items-center justify-center mx-auto mb-4">
            <AstralIcon name="horoscope" variant="gold" size="lg" glow />
          </div>
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
          {reports.map((r) => {
            const meta = REPORT_META[r.report_type] ?? {
              label: r.report_type,
              iconName: "wisdom" as AstralIconName,
              variant: "gold" as AstralIconVariant,
              iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
            };

            return (
              <Link key={r.id} to={`/dashboard/reports/${r.id}`}>
                <Card className="hover:border-[#C6A96B]/40 transition-all group cursor-pointer p-4 md:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.iconBg}`}>
                        <AstralIcon name={meta.iconName} variant={meta.variant} size="md" glow={false} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#F8F6F1] font-medium group-hover:text-[#D9BC82] transition-colors text-sm">
                          {meta.label}
                        </p>
                        <p className="text-[#94A3B8] text-xs mt-0.5 line-clamp-1">
                          {extractText(r.content).slice(0, 100)}…
                        </p>
                      </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
