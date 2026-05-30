import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireAuth, getProfile } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "ตั้งค่าโปรไฟล์ — PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const profile = await getProfile(user.id, request, env);
  return json({ user, profile });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const user = await requireAuth(request, env);
  const formData = await request.formData();

  const displayName = String(formData.get("displayName") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "");
  const birthTime = String(formData.get("birthTime") ?? "");
  const birthPlace = String(formData.get("birthPlace") ?? "");

  if (!displayName) {
    return json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
  }

  const { supabase } = createSupabaseClient(request, env);
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name:   displayName,
      birth_date:     birthDate   || null,
      birth_time:     birthTime   || null,
      birth_location: birthPlace  || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[settings] update error:", error.code, error.message);
    return json({ error: `${error.code}: ${error.message}` }, { status: 500 });
  }

  return redirect("/dashboard/settings?saved=1");
}

export default function SettingsPage() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const saved = url?.searchParams.get("saved") === "1";

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F3EFE8] mb-1">
          ตั้งค่าโปรไฟล์
        </h1>
        <p className="text-[#8A8070] text-sm">
          ข้อมูลวันเกิดช่วยให้ระบบคำนวณดวงชะตาได้แม่นยำขึ้น
        </p>
      </div>

      <Card>
        <Form method="post" className="flex flex-col gap-5">
          <Input
            name="displayName"
            label="ชื่อที่ใช้แสดง"
            defaultValue={profile?.display_name ?? ""}
            placeholder="ชื่อของคุณ"
            required
          />
          <Input
            name="birthDate"
            type="date"
            label="วันเกิด (ค.ศ.)"
            defaultValue={profile?.birth_date ?? ""}
          />
          <Input
            name="birthTime"
            type="time"
            label="เวลาเกิด (ถ้าทราบ)"
            defaultValue={profile?.birth_time ?? ""}
          />
          <Input
            name="birthPlace"
            label="จังหวัดที่เกิด"
            defaultValue={profile?.birth_location ?? profile?.birth_place ?? ""}
            placeholder="เช่น กรุงเทพมหานคร"
          />

          {actionData?.error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {actionData.error}
            </p>
          )}

          {saved && (
            <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
              บันทึกข้อมูลสำเร็จ ✓
            </p>
          )}

          <Button type="submit" loading={isLoading}>
            บันทึกข้อมูล
          </Button>
        </Form>
      </Card>
    </div>
  );
}
