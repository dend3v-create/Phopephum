import { json } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useTranslation } from "react-i18next";
import { createSupabaseClient, createServiceRoleClient } from "~/services/supabase.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "กู้คืนรหัสผ่าน — PhopePhum" },
];

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return json({ success: false, error: "กรุณากรอกอีเมล" }, { status: 400 });
  }

  // 1. ตรวจสอบว่ามีอีเมลนี้อยู่ในระบบสมาชิกหรือไม่
  try {
    const adminSupabase = createServiceRoleClient(env);
    const { data: profile, error: dbError } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (dbError) {
      console.error("Database check email error:", dbError);
      return json({ success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูลสมาชิก" }, { status: 500 });
    }

    if (!profile) {
      return json(
        { success: false, error: "ไม่พบอีเมลนี้ในระบบสมาชิก กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่" },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("Email verification exception:", err);
    return json({ success: false, error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }

  // 2. ดำเนินการรีเซ็ตรหัสผ่าน
  const { supabase, headers } = createSupabaseClient(request, env);
  
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("Forgot password error:", error);
    return json({ success: false, error: "ไม่สามารถส่งอีเมลได้ในขณะนี้: " + error.message }, { status: 500 });
  }

  return json({ success: true, error: null }, { headers });
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation("common");
  const actionData = useActionData<{ success: boolean; error: string | null }>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <Card glow>
      <h2 className="font-display text-2xl font-semibold text-[#F3EFE8] mb-1">
        {t("auth.forgot_password_title")}
      </h2>
      <p className="text-[#C6B79F] text-sm mb-8">
        {t("auth.forgot_password_desc")}
      </p>

      {actionData?.success ? (
        <div className="flex flex-col gap-6 text-center">
          <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-4 leading-relaxed">
            {t("auth.reset_success")}
          </p>
          <Link
            to="/login"
            className="text-sm text-[#C9A96E] hover:text-[#E8D4A8] transition-colors mt-2"
          >
            ย้อนกลับไปเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <Form method="post" className="flex flex-col gap-5">
          <Input
            name="email"
            type="email"
            label={t("auth.email")}
            placeholder="your@email.com"
            autoComplete="email"
            required
          />

          {actionData?.error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {actionData.error}
            </p>
          )}

          <Button type="submit" loading={isLoading} className="w-full mt-1">
            {t("auth.send_reset_link")}
          </Button>
          
          <p className="text-center text-[#C6B79F] text-sm mt-4">
            <Link
              to="/login"
              className="text-[#C9A96E] hover:text-[#E8D4A8] transition-colors"
            >
              ย้อนกลับไปเข้าสู่ระบบ
            </Link>
          </p>
        </Form>
      )}
    </Card>
  );
}
