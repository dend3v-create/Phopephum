import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  return redirect("/dashboard/partner");
}

export default function CommunityRedirect() {
  return null;
}
