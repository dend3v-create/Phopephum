import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function test() {
  const { data: userRes } = await supabase.auth.admin.createUser({
    email: `test_rpc_${Date.now()}@phopephum.com`,
    password: "Password123!",
    email_confirm: true,
  });
  const userId = userRes!.user!.id;
  await supabase.from("profiles").upsert({ id: userId, email: userRes!.user!.email });

  const { data, error } = await supabase.rpc("record_omise_payment_and_activate_atomic", {
    p_user_id: userId,
    p_omise_charge_id: `chrg_test_rpc_${Date.now()}`,
    p_payment_method: "promptpay",
    p_gross_amount_thb: 599.0,
    p_gateway_fee_thb: 9.88,
    p_gateway_vat_thb: 0.69,
    p_net_received_thb: 588.43,
    p_subscription_plan_code: "pro_monthly",
    p_vat_rate: 0.07,
    p_idempotency_key: `test_rpc:${Date.now()}`,
    p_metadata: {},
  });

  console.log("RPC Error:", error);
  console.log("RPC Data type:", typeof data, "Value:", data);

  await supabase.from("profiles").delete().eq("id", userId);
}

test();
