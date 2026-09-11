import { json } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { requireAuth } from "~/services/auth.server";
import { createActiveSubjectCookieHeader } from "~/services/activeSubject.server";
import type { Env } from "~/env.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAuth(request, env);

  try {
    const body = await request.json() as { subjectId?: string | null };
    const subjectId = body.subjectId || null;

    const cookieHeader = createActiveSubjectCookieHeader(subjectId);

    return json(
      { success: true, subjectId },
      {
        headers: {
          "Set-Cookie": cookieHeader,
        },
      }
    );
  } catch (err: any) {
    return json({ error: err.message || "Failed to set active subject" }, { status: 400 });
  }
}
