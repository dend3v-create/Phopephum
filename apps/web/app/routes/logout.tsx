import { redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { signOut } from "~/services/auth.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { headers } = await signOut(request, env);
  return redirect("/login", { headers });
}

export async function loader() {
  return redirect("/login");
}
