import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useTranslation } from "react-i18next";
import { createSupabaseClient } from "~/services/supabase.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ตั้งรหัสผ่านใหม่ — PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const { supabase } = createSupabaseClient(request, env);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return json({ error: "รหัสผ่านไม่ตรงกัน" }, { status: 400 });
  }

  if (password.length < 6) {
    return json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  }

  const { supabase, headers } = createSupabaseClient(request, env);
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Update password error:", error);
    return json({ error: "ไม่สามารถเปลี่ยนรหัสผ่านได้: " + error.message }, { status: 500 });
  }

  // นำทางไปหน้า dashboard พร้อมแนบ headers เพื่ออัปเดต session
  return redirect("/dashboard", { headers });
}

export default function ResetPasswordPage() {
  const { t } = useTranslation("common");
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#020617]">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A96E]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Link to="/" className="group inline-flex flex-col items-center">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center transition-transform group-hover:scale-105 duration-500">
              <div className="absolute inset-0 rounded-full border border-[#C6A96B]/30 bg-[#C6A96B]/5" />
              <span className="text-[#C6A96B] text-2xl font-bold z-10 font-display">P</span>
              <div className="absolute inset-0 opacity-20">
                 <svg viewBox="0 0 40 40" fill="none">
                   <circle cx="20" cy="20" r="18" stroke="#C6A96B" strokeWidth="0.5" strokeDasharray="2 2" />
                 </svg>
              </div>
            </div>
            <p className="text-[#C9A96E] text-[10px] tracking-[0.4em] uppercase mb-1.5 opacity-80">
              Living Wisdom OS
            </p>
            <h1 className="font-display text-4xl font-bold text-[#F3EFE8] glow-gold">
              PhopePhum
            </h1>
          </Link>
        </div>

        <Card glow>
          <h2 className="font-display text-2xl font-semibold text-[#F3EFE8] mb-1">
            {t("auth.reset_password")}
          </h2>
          <p className="text-[#C6B79F] text-sm mb-8">
            {t("auth.reset_password_desc")}
          </p>

          <Form method="post" className="flex flex-col gap-5">
            <Input
              name="password"
              type="password"
              label={t("auth.new_password")}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <Input
              name="confirmPassword"
              type="password"
              label={t("auth.confirm_new_password")}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            {actionData?.error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {actionData.error}
              </p>
            )}

            <Button type="submit" loading={isLoading} className="w-full mt-1">
              {t("auth.update_password")}
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
