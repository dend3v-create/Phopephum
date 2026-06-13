import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, Form, useNavigation, useActionData } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { requireOperator } from "~/services/auth.server";
import { createSupabaseClient } from "~/services/supabase.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { MembershipBadge, MembershipStatusBadge } from "~/components/MembershipBadge";
import type { Env } from "~/env.server";

export const meta: MetaFunction = () => [
  { title: "Operator Dashboard — PhopePhum" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireOperator(request, env);

  const { supabase } = createSupabaseClient(request, env);
  
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, membership_type, membership_status, membership_expires_at, subscription")
    .order("membership_status", { ascending: false }); // Pending at top usually, but let's just order

  if (error) {
    console.error("Error fetching users for operator:", error);
  }

  return json({
    users: users || [],
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireOperator(request, env);
  const formData = await request.formData();
  
  const intent = formData.get("intent");
  const targetUserId = String(formData.get("userId"));
  
  const { supabase } = createSupabaseClient(request, env);

  if (intent === "approve") {
    const { error } = await supabase
      .from("profiles")
      .update({ 
        membership_status: "active",
        plan: "basic",
        subscription: "basic",
        membership_type: "basic"
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  } 
  else if (intent === "set_premium") {
    const { error } = await supabase
      .from("profiles")
      .update({ 
        membership_type: "premium",
        subscription: "premium",
        plan: "pro",
        membership_status: "active"
      })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  }
  else if (intent === "add_30_days") {
    // We need to fetch current expires_at
    const { data: profile } = await supabase.from("profiles").select("membership_expires_at").eq("id", targetUserId).single();
    let currentExpires = profile?.membership_expires_at ? new Date(profile.membership_expires_at) : new Date();
    if (currentExpires.getTime() < Date.now()) {
      currentExpires = new Date();
    }
    currentExpires.setDate(currentExpires.getDate() + 30);
    
    const { error } = await supabase
      .from("profiles")
      .update({ membership_expires_at: currentExpires.toISOString() })
      .eq("id", targetUserId);
    if (error) return json({ error: error.message }, { status: 500 });
  }

  return redirect("/operator");
}

export default function OperatorDashboard() {
  const { users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-display font-bold text-[#F8F6F1] mb-2">
          Operator Dashboard
        </h1>
        <p className="text-[#94A3B8]">
          Manage user memberships, approvals, and roles.
        </p>
      </header>

      {actionData?.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
          {actionData.error}
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="py-3 px-4 font-semibold text-[#C6B79F] text-sm uppercase">User</th>
              <th className="py-3 px-4 font-semibold text-[#C6B79F] text-sm uppercase">Role</th>
              <th className="py-3 px-4 font-semibold text-[#C6B79F] text-sm uppercase">Level</th>
              <th className="py-3 px-4 font-semibold text-[#C6B79F] text-sm uppercase">Status</th>
              <th className="py-3 px-4 font-semibold text-[#C6B79F] text-sm uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {users.map((u) => {
              const membershipType = u.membership_type || u.subscription || "free";
              const membershipStatus = u.membership_status || "active";
              let daysRemaining = 0;
              if (u.membership_expires_at) {
                daysRemaining = Math.max(0, Math.ceil((new Date(u.membership_expires_at).getTime() - Date.now()) / 86400000));
              }

              return (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-[#F8F6F1] font-medium">{u.display_name || "Unnamed"}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{u.id}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-400 capitalize text-sm">
                    {u.role || "member"}
                  </td>
                  <td className="py-3 px-4">
                    <MembershipBadge type={membershipType} showIcon={false} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <MembershipStatusBadge status={membershipStatus} />
                      {daysRemaining > 0 && <span className="text-xs text-slate-400">{daysRemaining} วัน</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-2">
                      {membershipStatus === "pending" && (
                        <Form method="post">
                          <input type="hidden" name="userId" value={u.id} />
                          <Button name="intent" value="approve" className="h-7 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none">
                            Approve
                          </Button>
                        </Form>
                      )}
                      {membershipType !== "premium" && (
                        <Form method="post">
                          <input type="hidden" name="userId" value={u.id} />
                          <Button name="intent" value="set_premium" className="h-7 text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-none">
                            Upgrade
                          </Button>
                        </Form>
                      )}
                      <Form method="post">
                        <input type="hidden" name="userId" value={u.id} />
                        <Button name="intent" value="add_30_days" variant="outline" className="h-7 text-xs border-slate-700 hover:bg-slate-800">
                          +30 วัน
                        </Button>
                      </Form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
