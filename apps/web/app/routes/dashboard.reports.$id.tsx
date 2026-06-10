import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `${data?.label ?? "รายงาน"} — PhopePhum` },
];

const REPORT_LABELS: Record<string, string> = {
  general_prediction: "พยากรณ์ปัญญาชีวิต (Therapy)",
  life_overview:      "โครงสร้างชีวิตเชิงลึก",
  personal_branding:  "ตัวตน & อัตลักษณ์",
  career:             "ภารกิจ & ความสำเร็จ",
  relationship:       "เสน่ห์ & ความสัมพันธ์",
  health:             "สุขภาพ & พลังชีวิต",
  wealth:             "กระแสทรัพย์ & มั่งคั่ง",
  daily_insight:      "ปัญญาญาณรายวัน",
  annual_forecast:    "จังหวะชะตารายปี",
  horoscope:          "ดวงชะตา",
  numerology:         "ตัวเลขโชคชะตา",
  yearly:             "พยากรณ์รายปี",
  monthly:            "พยากรณ์รายเดือน",
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  const { supabase } = createSupabaseClient(request, env);
  const { data: report, error } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, content")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !report) {
    throw new Response("ไม่พบรายงาน", { status: 404 });
  }

  const label = REPORT_LABELS[report.report_type] ?? report.report_type;
  const text = extractText(report.content);

  return json({ report, label, text });
}

export default function ReportDetail() {
  const { report, label, text } = useLoaderData<typeof loader>();

  const date = new Date(report.created_at).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "2-digit",
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        to="/dashboard/reports"
        className="inline-flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#D9BC82] transition-colors"
      >
        <span>←</span> รายงานทั้งหมด
      </Link>

      {/* Header */}
      <div>
        <p className="text-[#D9BC82] text-xs tracking-widest uppercase mb-2">{date}</p>
        <h1 className="font-display text-3xl font-bold text-[#F8F6F1]">{label}</h1>
      </div>

      {/* Content */}
      <Card>
        <div className="prose prose-invert max-w-none">
          <ReportBody text={text} />
        </div>
      </Card>
    </div>
  );
}

/** Render markdown-ish text with basic formatting */
function ReportBody({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-3 text-[#D9CDB7] leading-relaxed text-sm">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (/^#{1,2}\s/.test(line)) {
          const content = line.replace(/^#{1,2}\s+/, "");
          return (
            <h2 key={i} className="font-display text-xl font-bold text-[#F8F6F1] mt-6 mb-2 glow-gold">
              {content}
            </h2>
          );
        }
        if (/^###/.test(line)) {
          const content = line.replace(/^###\s+/, "");
          return (
            <h3 key={i} className="font-semibold text-[#D9BC82] mt-4 mb-1">
              {content}
            </h3>
          );
        }
        if (/^[-*]\s/.test(line)) {
          const content = line.replace(/^[-*]\s+/, "");
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[#C6A96B] mt-0.5 shrink-0">·</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

/** Bold and italic inline */
function renderInline(text: string) {
  const parts = text.split(/(\*{1,3}[^*]+\*{1,3})/g);
  return parts.map((part, i) => {
    if (/^\*{3}.+\*{3}$/.test(part))
      return <strong key={i} className="text-[#F2D49B] font-semibold">{part.slice(3, -3)}</strong>;
    if (/^\*{2}.+\*{2}$/.test(part))
      return <strong key={i} className="text-[#F8F6F1] font-semibold">{part.slice(2, -2)}</strong>;
    if (/^\*.+\*$/.test(part))
      return <em key={i} className="text-[#9AB3D9]">{part.slice(1, -1)}</em>;
    return part;
  });
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text;
    if (typeof c.content === "string") return c.content;
    if (typeof c.summary === "string") return c.summary;
  }
  return "";
}
