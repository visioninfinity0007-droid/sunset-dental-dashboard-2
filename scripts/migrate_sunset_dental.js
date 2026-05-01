const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = process.env.CLIENT_SUNSET_DENTAL_EMAIL || "info@sunset-dental.demo";
  const password = process.env.CLIENT_SUNSET_DENTAL_PASSWORD || "demo-password-123!";
  const businessName = "Sunset Dental Care";
  const slug = "sunset-dental";
  const instanceName = process.env.SUNSET_DENTAL_EVOLUTION_INSTANCE || "sunset_main_1";

  console.log(`Migrating ${slug}...`);

  // 1. Create auth user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    if (!userError.message.includes("already registered")) {
      console.error("Failed to create user:", userError);
      return;
    }
    console.log("User already exists, continuing...");
  }
  
  const userId = userData?.user?.id || (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email).id;

  // 2. Create tenant
  const { data: tenantData, error: tenantError } = await supabase
    .from("tenants")
    .upsert({ slug, business_name: businessName, plan: "starter" }, { onConflict: "slug" })
    .select("id")
    .single();

  if (tenantError) {
    console.error("Failed to create tenant:", tenantError);
    return;
  }
  
  const tenantId = tenantData.id;

  // 3. Create tenant_member
  const { error: memberError } = await supabase
    .from("tenant_members")
    .upsert({ tenant_id: tenantId, user_id: userId, role: "owner", status: "active" }, { onConflict: "tenant_id,user_id" });

  if (memberError) {
    console.error("Failed to create member:", memberError);
    return;
  }

  // 4. Create whatsapp_instance
  const { error: instanceError } = await supabase
    .from("whatsapp_instances")
    .upsert({
      tenant_id: tenantId,
      evolution_instance_name: instanceName,
      label: "Main line",
      is_primary: true,
      evolution_status: "connected" // assuming legacy one is already connected
    }, { onConflict: "evolution_instance_name" });

  if (instanceError) {
    console.error("Failed to create whatsapp instance:", instanceError);
    return;
  }

  console.log("Successfully migrated sunset-dental! You can now run import_sheets_to_supabase.js");
}

run();
