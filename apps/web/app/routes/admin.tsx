import { json } from "@remix-run/cloudflare";
import { Outlet, Form, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAdmin } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { NavLink } from "~/components/ui/NavLink";
import type { Env } from "~/env.server";
import { useState } from "react";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { user, profile } = await requireAdmin(request, env);

  await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "admin_web" });

  return json({ user, profile });
}

export default function AdminLayout() {
  const { profile } = useLoaderData<typeof loader>();
  const displayName =
    profile?.display_name ?? profile?.email ?? "Admin";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#020617]">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`flex flex-col w-64 p-5 fixed h-full border-r z-40 transition-transform duration-300 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(56,189,248,0.12)",
        }}
      >
        {/* Logo */}
        <div className="mb-8 pl-1">
          <p className="text-[#38BDF8] text-[9px] tracking-[0.3em] uppercase mb-1.5 opacity-70">
            System Administration
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F8F6F1] drop-shadow-md">
            PhopePhum
          </h2>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavLink to="/admin" icon={<IconHome />} label="Overview" />
          <NavLink to="/admin/users" icon={<IconUsers />} label="จัดการสมาชิก" />
          <NavLink to="/admin/approvals" icon={<IconApprove />} label="อนุมัติคำขอ" />
          <div className="mt-8 mb-2">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider pl-3">Back to App</p>
          </div>
          <NavLink to="/dashboard" icon={<IconApp />} label="User Dashboard" />
        </nav>

        {/* User */}
        <div className="border-t pt-4 mt-4" style={{ borderColor: "rgba(56,189,248,0.12)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#38BDF8] text-sm font-semibold"
              style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.25)" }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#F8F6F1] truncate">{displayName}</p>
              <p className="text-xs text-[#38BDF8] font-medium truncate capitalize">
                {profile?.role ?? "Admin"}
              </p>
            </div>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="w-full text-left text-xs text-[#94A3B8] hover:text-[#F8F6F1] px-2 py-1.5 rounded-lg transition-colors"
              style={{ "--hover-bg": "rgba(239,68,68,0.12)" } as React.CSSProperties}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              ออกจากระบบ (Logout)
            </button>
          </Form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(56,189,248,0.12)",
        }}
      >
        <h2 className="font-display text-xl font-bold text-[#F8F6F1]">
          Admin Panel
        </h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all text-[#38BDF8]"
          aria-label="เมนู"
        >
          <MobileMenu />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v11h14V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconApprove() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function MobileMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6 text-[#38BDF8]">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
