import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".dev.vars") });
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.dev.vars") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("🚀 Applying migration 023_monetization_integrity_and_entitlements.sql to Supabase...");

  const migrationSql = fs.readFileSync(
    path.resolve(process.cwd(), "infrastructure/supabase/migrations/023_monetization_integrity_and_entitlements.sql"),
    "utf-8"
  );

  // Split SQL or execute via postgres function or direct calls
  // In Supabase, if there's an exec_sql or direct postgres connection, or via REST / rpc:
  // Let's test if there's an exec_sql rpc or if we can run via Postgres connection / pg client.
  const { error } = await supabase.rpc("exec_sql", { query: migrationSql }).catch(() => ({ error: { message: "no exec_sql rpc" } }));

  if (error) {
    console.log("ℹ️ RPC exec_sql note:", error.message);
  }
}

main().catch(console.error);
