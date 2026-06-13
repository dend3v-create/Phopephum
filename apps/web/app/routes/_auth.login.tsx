import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { signIn } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "เข้าสู่ระบบ — PhopePhum" },
];

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
  }

  const { error, headers } = await signIn(email, password, request, env);

  if (error) {
    const msg = error.message.toLowerCase().includes("email not confirmed")
      ? "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ — ตรวจสอบ inbox ของคุณ"
      : "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    return json({ error: msg }, { status: 401 });
  }

  await logEvent(request, env, EVENTS.DAILY_VISIT, { source: "web" });
  return redirect("/dashboard", { headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <Card glow>
      <h2 className="font-display text-2xl font-semibold text-[#F3EFE8] mb-1">
        เข้าสู่ระบบ
      </h2>
      <p className="text-[#C6B79F] text-sm mb-8">
        ยินดีต้อนรับกลับมา
      </p>

      <Form method="post" className="flex flex-col gap-5">
        <Input
          name="email"
          type="email"
          label="อีเมล"
          placeholder="your@email.com"
          autoComplete="email"
          required
        />
        <Input
          name="password"
          type="password"
          label="รหัสผ่าน"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {actionData?.error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {actionData.error}
          </p>
        )}

        <Button type="submit" loading={isLoading} className="w-full mt-1">
          เข้าสู่ระบบ
        </Button>
      </Form>

      <p className="text-center text-[#C6B79F] text-sm mt-6">
        ยังไม่มีบัญชี?{" "}
        <Link
          to="/register"
          className="text-[#C9A96E] hover:text-[#E8D4A8] transition-colors"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </Card>
  );
}
