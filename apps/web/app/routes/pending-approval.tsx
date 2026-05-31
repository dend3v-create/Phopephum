/**
 * pending-approval.tsx
 * หน้ารอการอนุมัติจากแอดมิน
 */
import { Form } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "รอการอนุมัติ — PhopePhum" },
];

export default function PendingApprovalPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#020617" }}
    >
      <div
        className="max-w-md w-full rounded-3xl border p-8 text-center"
        style={{
          background: "rgba(10,22,40,0.80)",
          backdropFilter: "blur(24px)",
          borderColor: "rgba(198,169,107,0.20)",
        }}
      >
        {/* Icon */}
        <div className="text-5xl mb-5 opacity-80">⏳</div>

        {/* Logo */}
        <p className="font-display text-xs tracking-[0.25em] uppercase text-[#C6A96B] mb-1">
          PhopePhum
        </p>
        <h1 className="font-display text-2xl font-bold text-[#F8F6F1] mb-3">
          รอการอนุมัติ
        </h1>

        <p className="text-[#D9CDB7] text-sm leading-relaxed mb-6">
          บัญชีของคุณถูกสร้างเรียบร้อยแล้ว ✨<br />
          ทีมงานจะตรวจสอบและเปิดใช้งานให้ภายใน{" "}
          <span className="text-[#C6A96B] font-semibold">24 ชั่วโมง</span>
        </p>

        <div
          className="rounded-2xl border p-4 mb-6 text-left space-y-2"
          style={{
            background: "rgba(198,169,107,0.05)",
            borderColor: "rgba(198,169,107,0.15)",
          }}
        >
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider mb-2">
            ขั้นตอนถัดไป
          </p>
          {[
            "แอดมินได้รับการแจ้งเตือนแล้ว",
            "รอการตรวจสอบและอนุมัติ",
            "คุณจะได้รับ Email แจ้งผล",
            "เข้าใช้งานได้ทันทีหลังอนุมัติ",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#C6A96B] text-xs">✦</span>
              <span className="text-[#D9CDB7] text-sm">{step}</span>
            </div>
          ))}
        </div>

        <Form action="/logout" method="post">
          <button
            type="submit"
            className="text-[#94A3B8] text-xs hover:text-[#C6A96B] transition-colors"
          >
            ออกจากระบบ
          </button>
        </Form>
      </div>
    </div>
  );
}
