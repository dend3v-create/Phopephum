import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { requireAuth, getProfile } from "~/services/auth.server";
import { generateWht50TawiReport, exportWht50TawiCsv } from "~/services/statement.server";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 7.2F: ADMIN 50 TAWI CSV REPORT DOWNLOAD ENDPOINT
// ==============================================================================

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);

  if (!profile || (profile.role !== "admin" && profile.role !== "finance_officer")) {
    return new Response("Unauthorized: Admin or Finance Officer role required", { status: 403 });
  }

  const url = new URL(request.url);
  const now = new Date();
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  const report = await generateWht50TawiReport({
    year,
    month,
    env,
  });

  const csvData = exportWht50TawiCsv(report);
  const filename = `phopephum-wht-50tawi-${year}-${String(month).padStart(2, "0")}.csv`;

  return new Response(csvData, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
