import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, role, display_name")
    .in("role", ["admin", "finance_officer"]);

  console.log("Existing Admin Profiles:", admins);
}

check();
