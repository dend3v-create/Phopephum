import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { captureReferralClick } from "~/services/attribution.server";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const code = params.code;
  const env = context.cloudflare.env;
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const campaign = url.searchParams.get("c") || url.searchParams.get("utm_campaign") || null;

  if (!code) {
    return redirect(next);
  }

  const { headers } = await captureReferralClick({
    request,
    partnerCode: code,
    campaignCode: campaign,
    env,
  });

  return redirect(next, { headers });
}

export default function ReferralRedirect() {
  return null;
}
