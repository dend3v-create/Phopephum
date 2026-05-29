import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { signUp } from "~/services/auth.server";
import { logEvent, EVENTS } from "~/services/analytics.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "สมัครสมาชิก — PhopePhum" },
];

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  if (!email || !password || !displayName) {
    return json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }

  if (password.length < 8) {
    return json(
      { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" },
      { status: 400 }
    );
  }

  const { user, error, headers } = await signUp(email, password, displayName, request, env);

  if (error) {
    const msg =
      error.message.includes("already registered")
        ? "อีเมลนี้ถูกใช้งานแล้ว"
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return json({ error: msg }, { status: 400 });
  }

  if (user) {
    await logEvent(request, env, EVENTS.USER_REGISTERED, {
      method: "email",
    });
  }

  return redirect("/dashboard", { headers });
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <Card glow>
      <h2 className="font-display text-2xl font-semibold text-[#F3EFE8] mb-1">
        สมัครสมาชิก
      </h2>
      <p className="text-[#8A8070] text-sm mb-8">
        เริ่มต้นเส้นทางปัญญาชีวิตของคุณ
      </p>

      <Form method="post" className="flex flex-col gap-5">
        <Input
          name="displayName"
          type="text"
          label="ชื่อที่ใช้แสดง"
          placeholder="ชื่อของคุณ"
          autoComplete="name"
          required
        />
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
          placeholder="อย่างน้อย 8 ตัวอักษร"
          autoComplete="new-password"
          required
          minLength={8}
        />

        {actionData?.error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {actionData.error}
          </p>
        )}

        <Button type="submit" loading={isLoading} className="w-full mt-1">
          สมัครสมาชิกฟรี
        </Button>
      </Form>

      <p className="text-center text-[#8A8070] text-sm mt-6">
        มีบัญชีแล้ว?{" "}
        <Link
          to="/login"
          className="text-[#C9A96E] hover:text-[#E8D4A8] transition-colors"
        >
          เข้าสู่ระบบ
        </Link>
      </p>

      <p className="text-center text-[#8A8070] text-xs mt-4">
        การสมัครสมาชิกแสดงว่าคุณยอมรับ{" "}
        <span className="text-[#C9A96E]">ข้อกำหนดการใช้งาน</span>
      </p>
    </Card>
  );
}
