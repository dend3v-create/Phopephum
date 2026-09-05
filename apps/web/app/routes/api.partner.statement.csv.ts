import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import type { Env } from "~/env.server";
import { requireAuth } from "~/services/auth.server";
import { getOrCreatePartnerProfile } from "~/services/partner.server";
import { generatePartnerMonthlyStatement, exportPartnerStatementCsv } from "~/services/statement.server";

// ==============================================================================
// 🏛️ PHOPEPHUM V3 — STEP 7.2F: PARTNER STATEMENT CSV DOWNLOAD ENDPOINT
// ==============================================================================

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);

  const url = new URL(request.url);
  const now = new Date();
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  const partner = await getOrCreatePartnerProfile(user.id, env);
  if (!partner) {
    return new Response("Partner entity not found", { status: 404 });
  }

  const statement = await generatePartnerMonthlyStatement({
    partnerId: partner.id,
    year,
    month,
    env,
  });

  if (!statement) {
    return new Response("Unable to generate monthly statement", { status: 500 });
  }

  const csvData = exportPartnerStatementCsv(statement);
  const filename = `phopephum-statement-${partner.partnerCode}-${year}-${String(month).padStart(2, "0")}.csv`;

  return new Response(csvData, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
