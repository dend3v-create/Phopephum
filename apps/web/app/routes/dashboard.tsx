import { json, redirect } from "@remix-run/cloudflare";
import { Outlet, useLoaderData, useLocation } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { ProtectedContent } from "~/components/ui/ProtectedContent";
import { MobileBottomNav } from "~/components/layout/MobileBottomNav";
import { AppTopBar } from "~/components/layout/AppTopBar";
import { DesktopSidebar } from "~/components/layout/DesktopSidebar";
import type { Env } from "~/env.server";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  try {
    const profile = await getProfile(user.id, request, env);

    if (profile?.membership_status === "pending" && profile?.role === "user") {
      throw redirect("/pending-approval");
    }

    if (!profile?.birth_date && profile?.role === "user") {
      throw redirect("/onboarding");
    }

    await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });
    return json({ user, profile });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("Dashboard Layout Loader Error:", err);
    return json({ user, profile: null });
  }
}

export default function DashboardLayout() {
  const { user, profile } = useLoaderData<typeof loader>();
  const { t } = useTranslation("common");
  const location = useLocation();

  const displayName = profile?.display_name ?? profile?.email ?? t("auth.user", "ผู้ใช้งาน");
  const isPro = profile?.role === "admin" || profile?.role === "operator" || profile?.plan === "imperial" || profile?.plan === "pro";
  const timeSands = profile?.time_sands ?? 0;
  const plan = profile?.plan ?? "free";
  const role = profile?.role ?? "user";

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#020617] text-[#F8F6F1] w-full max-w-full overflow-x-hidden">
      {/* ── 1. Desktop Sidebar (md:flex) & Mobile Drawer ── */}
      <DesktopSidebar
        displayName={displayName}
        email={user.email || ""}
        plan={plan}
        role={role}
        timeSands={timeSands}
        isPro={isPro}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* ── 2. Mobile Top Bar (md:hidden) ── */}
      <AppTopBar
        displayName={displayName}
        timeSands={timeSands}
        isPro={isPro}
        onOpenProDrawer={() => setIsMobileDrawerOpen(true)}
      />

      {/* ── 3. Main Content Outlet ── */}
      <main
        className="flex-1 md:ml-64 min-h-screen transition-all w-full max-w-full min-w-0 overflow-x-hidden"
        style={{
          paddingTop: "var(--topbar-h, 52px)",
          paddingBottom: "calc(var(--bottombar-h, 62px) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            main {
              --topbar-h: 0px !important;
              --bottombar-h: 0px !important;
              padding-bottom: 2rem !important;
            }
          }
        `}</style>
        <ProtectedContent
          userLabel={profile?.display_name ? `${profile.display_name} · ${user.email}` : user.email}
          className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 md:py-6 w-full max-w-full min-w-0 overflow-x-hidden"
        >
          <Outlet />
        </ProtectedContent>
      </main>

      {/* ── 4. Mobile Bottom Navigation (5 Tabs) ── */}
      <MobileBottomNav currentPath={location.pathname} />
    </div>
  );
}
