import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zogmmylndlpcpzhjoutv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ21teWxuZGxwY3B6aGpvdXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDgwODgsImV4cCI6MjA5NTM4NDA4OH0.7WdKndPZEG9Ocl1grESC18MtgHt7HOWQBo9QK4R4Mms";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("Signing up...");
  let userId;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: "dend3v@gmail.com",
    password: "den2235919",
    options: {
      data: { display_name: "Admin DenD3v" }
    }
  });

  if (signUpError) {
    console.error("Sign up error (might already exist):", signUpError.message);
    
    console.log("Trying to login instead...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "dend3v@gmail.com",
      password: "den2235919"
    });

    if (authError) {
      console.error("Login failed:", authError.message);
      return;
    }
    userId = authData.user.id;
  } else {
    userId = signUpData.user.id;
  }

  console.log("Success! User ID:", userId);

  console.log("Updating profile...");
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin", subscription: "premium" })
    .eq("id", userId);

  if (updateError) {
    console.error("Update failed:", updateError.message);
    return;
  }

  console.log("Successfully updated to Admin and Premium!");
}

main();
