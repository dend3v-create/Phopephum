import { json } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import type { Env } from "~/env.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  const { supabase } = createSupabaseClient(request, env);
  
  // Get quick stats
  const [
    { count: userCount },
    { count: reportCount },
    { count: eventCount }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("ai_reports").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
  ]);

  return json({
    stats: {
      users: userCount ?? 0,
      reports: reportCount ?? 0,
      events: eventCount ?? 0,
    }
  });
}

export default function AdminOverview() {
  const { stats } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-display font-bold text-[#F8F6F1] mb-2">
          System Overview
        </h1>
        <p className="text-[#94A3B8]">
          Welcome to the PhopePhum administration dashboard.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users.toString()}
          label="Registered accounts"
          icon={<IconUsers className="w-5 h-5 text-[#38BDF8]" />}
        />
        <StatCard
          title="AI Reports Generated"
          value={stats.reports.toString()}
          label="Total generations"
          icon={<IconSparkles className="w-5 h-5 text-[#818CF8]" />}
        />
        <StatCard
          title="System Events Tracked"
          value={stats.events.toString()}
          label="Total analytics events"
          icon={<IconActivity className="w-5 h-5 text-[#34D399]" />}
        />
      </div>

      <div className="p-8 rounded-2xl border" style={{
        background: "rgba(15,23,42,0.6)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(56,189,248,0.12)"
      }}>
        <h3 className="text-xl font-semibold text-[#F8F6F1] mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/admin/users"
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#38BDF8]/30 transition-all group"
          >
            <div className="p-3 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8]">
              <IconUsers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F8F6F1]">จัดการสมาชิก</p>
              <p className="text-xs text-[#94A3B8]">ดูรายชื่อและแก้ไขสิทธิ์ผู้ใช้</p>
            </div>
          </Link>

          <Link
            to="/admin/approvals"
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#C6A96B]/30 transition-all group"
          >
            <div className="p-3 rounded-lg bg-[#C6A96B]/10 text-[#C6A96B]">
              <IconApprove className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F8F6F1]">อนุมัติคำขอ</p>
              <p className="text-xs text-[#94A3B8]">จัดการคำอัปเกรดแพ็กเกจ</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, label, icon }: { title: string, value: string, label: string, icon: React.ReactNode }) {
  return (
    <div
      className="p-6 rounded-2xl border flex flex-col relative overflow-hidden group"
      style={{
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(56,189,248,0.15)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
      }}
    >
      <div className="flex items-center gap-4 mb-4 z-10">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="z-10">
        <p className="text-4xl font-display font-bold text-[#F8F6F1] mb-1">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#38BDF8] opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500" />
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconActivity({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconApprove({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}
