import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.updateUserById(
  "abcce254-c321-44cb-8e5a-0162745b4277",
  {
    email: "verymystery18@gmail.com",
    email_confirm: true,
    password: process.env.NEW_ADMIN_PASSWORD,
  }
);

if (error) {
  console.error("ERROR:", error.message);
  process.exit(1);
}

console.log("Email:", data.user.email);
console.log("Confirmed:", Boolean(data.user.email_confirmed_at));
console.log("Identity emails:", data.user.identities?.map(i => i.identity_data?.email));


