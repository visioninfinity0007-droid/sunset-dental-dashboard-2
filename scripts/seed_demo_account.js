require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TENANT_ID = "apex-b2b-demo";
const TENANT_BUSINESS_NAME = "Apex B2B Agency — Demo";
const DEMO_EMAIL = "awais.oraimo@gmail.com";
const DEMO_PASSWORD = "Admin@123";

class PRNG {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  randInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice(arr) {
    return arr[this.randInt(0, arr.length - 1)];
  }
  weightedChoice(choices) {
    const totalWeight = choices.reduce((sum, item) => sum + item.weight, 0);
    let randomValue = this.next() * totalWeight;
    for (const choice of choices) {
      if (randomValue < choice.weight) return choice.value;
      randomValue -= choice.weight;
    }
    return choices[choices.length - 1].value;
  }
}

const FIRST_NAMES = [
  "Ahmed", "Ali", "Ayesha", "Bilal", "Danish", "Eman", "Fahad", "Fatima", "Hassan", "Hira", "Irfan", "Kamran", "Khadija", "Mahnoor", "Nabeel", "Nida", "Omar", "Osman", "Qasim", "Raza", "Saad", "Sana", "Tariq", "Umair", "Usman", "Waqas", "Yasir", "Zain", "Zainab", "Zeeshan", "Adeel", "Amir", "Asad", "Atif", "Babar", "Farhan", "Faisal", "Hamza", "Haris", "Imran", "Junaid", "Kashif", "Mansoor", "Mohsin", "Naveed", "Raheel", "Rizwan", "Salman", "Shahzad", "Shoaib", "Sohail", "Tahir", "Umar", "Waseem", "Zahid"
];
const LAST_NAMES = [
  "Abbas", "Ahmed", "Ali", "Ansari", "Awan", "Baig", "Bhatti", "Bukhari", "Butt", "Chaudhry", "Dar", "Farooqi", "Gill", "Gujjar", "Hussain", "Iqbal", "Jadoon", "Janjua", "Javed", "Kazi", "Khalid", "Khan", "Khawaja", "Lodhi", "Mahmood", "Majeed", "Malik", "Mansoor", "Mir", "Mirza", "Mughal", "Niazi", "Pasha", "Qazi", "Qureshi", "Raja", "Rajput", "Rana", "Rathore", "Rehman", "Saeed", "Shafiq", "Shah", "Sheikh", "Siddiqui", "Syed", "Tariq", "Usmani", "Yousaf", "Zaidi", "Zaman", "Zia"
];

const SOURCES = [
  { value: "meta_ads", weight: 40 },
  { value: "google_ads", weight: 25 },
  { value: "linkedin_ads", weight: 8 },
  { value: "organic", weight: 12 },
  { value: "referral", weight: 10 },
  { value: "whatsapp_direct", weight: 5 }
];

const CAMPAIGNS = {
  meta_ads: ["b2b_decision_makers_q2", "lookalike_top_converters", "linkedin_creative_carousel", "lead_form_optimization", "retarget_demo_visitors"],
  google_ads: ["branded_search", "competitor_keywords", "high_intent_kw_pricing", "solutions_landing", "comparison_terms"],
  linkedin_ads: ["vp_sales_targeting", "revops_intent_data", "enterprise_account_focus"]
};

function generateFakePhone(rng) {
  const prefixes = [];
  for (let i = 1; i <= 48; i++) prefixes.push(`03${i.toString().padStart(2, '0')}`);
  const prefix = rng.choice(prefixes);
  const number = rng.randInt(1000000, 9999999);
  return `+92${prefix.substring(1)}${number}`;
}

async function getOrCreateTenant(tenantId) {
  // Wipe existing
  await supabase.from("tenants").delete().eq("slug", tenantId);

  const { data: tenant, error } = await supabase.from("tenants").insert({
    slug: tenantId,
    business_name: TENANT_BUSINESS_NAME,
    plan: "business",
    bot_personality: "Demo",
  }).select().maybeSingle();

  if (error) throw new Error(`Failed to create tenant: ${error.message}`);
  return tenant.id;
}

async function getOrCreateDemoUser() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw new Error(`Failed to list users: ${listError.message}`);

  let demoUser = users.find(u => u.email === DEMO_EMAIL);

  if (!demoUser) {
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Awais Oraimo" }
    });
    if (createError) throw new Error(`Failed to create demo user: ${createError.message}`);
    demoUser = user;
  }
  return demoUser;
}

async function main() {
  try {
    console.log("Seeding B2B Demo Account...");

    const demoUser = await getOrCreateDemoUser();
    const tenantDbId = await getOrCreateTenant(TENANT_ID);

    // Explicitly create tenant_members row
    const { error: memberError } = await supabase.from("tenant_members").insert({
      tenant_id: tenantDbId,
      user_id: demoUser.id,
      role: "owner",
      status: "active"
    });
    if (memberError && memberError.code !== '23505') throw new Error(`Failed to create tenant_members: ${memberError.message}`);

    // Create 3 Instances
    const instances = [
      { label: "PipelineIQ — Sales", name: "demo_apex_pipelineiq", is_primary: true },
      { label: "Northstar — Quotes", name: "demo_apex_northstar", is_primary: false },
      { label: "MetroPack — Bulk", name: "demo_apex_metropack", is_primary: false }
    ];

    const insertedInstances = [];
    for (const inst of instances) {
      const { data, error } = await supabase.from("whatsapp_instances").insert({
        tenant_id: tenantDbId,
        label: inst.label,
        evolution_instance_name: inst.name,
        evolution_status: "connected",
        connected_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)).toISOString(),
        is_primary: inst.is_primary,
        whatsapp_phone: `+92311${instances.indexOf(inst) + 1}0${instances.indexOf(inst) + 1}0101`
      }).select().maybeSingle();
      if (error) throw new Error(`Failed to insert instance ${inst.label}: ${error.message}`);
      insertedInstances.push(data);
    }

    const rng = new PRNG(88888);
    const now = new Date("2026-05-01T12:00:00Z");

    const leads = [];
    const messages = [];
    const appointments = [];

    const brandConfigs = [
      {
        count: 60,
        instanceId: insertedInstances[0].id,
        purchases: ["Pro plan annual", "Team add-on", "Enterprise Setup"],
        amountRange: [150, 2400],
        purchaseCountRange: [1, 3],
        currency: "USD",
        topics: ["pricing", "free trial", "demos", "integrations (HubSpot/Salesforce)", "team plans", "security/SOC2"]
      },
      {
        count: 70,
        instanceId: insertedInstances[1].id,
        purchases: ["FCL Karachi-Dubai", "LCL Karachi-Jeddah", "Air Freight Sample", "Customs Clearance"],
        amountRange: [80000, 650000],
        purchaseCountRange: [1, 4],
        currency: "PKR",
        topics: ["container rate quotes", "customs handling", "LCL vs FCL", "port pickup", "shipment tracking", "account opening"]
      },
      {
        count: 50,
        instanceId: insertedInstances[2].id,
        purchases: ["10k corrugated cartons", "5k custom labels", "Pallet Shrink Wrap", "1000 Premium Mailers"],
        amountRange: [25000, 450000],
        purchaseCountRange: [1, 6],
        currency: "PKR",
        topics: ["bulk pricing", "custom-print MOQ", "lead times", "samples", "design help", "recurring orders"]
      }
    ];

    let appointmentCount = 0;

    for (const brand of brandConfigs) {
      let emergencyCount = 0;
      
      for (let i = 0; i < brand.count; i++) {
        const phone = generateFakePhone(rng);
        const name = `${rng.choice(FIRST_NAMES)} ${rng.choice(LAST_NAMES)}`;
        
        const statusChoice = rng.weightedChoice([
          { value: "new", weight: 25 },
          { value: "engaged", weight: 30 },
          { value: "qualified", weight: 15 },
          { value: "booked-discovery-call", weight: 18 },
          { value: "won", weight: 8 },
          { value: "lost", weight: 4 }
        ]);

        let intent = rng.weightedChoice([
          { value: "hot", weight: 18 },
          { value: "warm", weight: 38 },
          { value: "cold", weight: 44 }
        ]);

        if (emergencyCount < 2) {
          intent = "emergency";
          emergencyCount++;
        }

        let score;
        if (intent === "hot" || intent === "emergency") score = rng.randInt(75, 98);
        else if (intent === "warm") score = rng.randInt(45, 75);
        else score = rng.randInt(5, 45);

        const source = rng.weightedChoice(SOURCES);
        let campaign = null;
        if (CAMPAIGNS[source]) {
          campaign = rng.choice(CAMPAIGNS[source]);
        }

        const lang = rng.weightedChoice([
          { value: "en", weight: 80 },
          { value: "mixed", weight: 15 },
          { value: "ur", weight: 5 }
        ]);

        const handler = rng.weightedChoice([
          { value: "bot", weight: 88 },
          { value: "human", weight: 12 }
        ]);

        let pastPurchasesArr = [];
        let clv = 0;
        if (rng.next() < 0.25) {
          const count = rng.randInt(brand.purchaseCountRange[0], brand.purchaseCountRange[1]);
          for (let j = 0; j < count; j++) {
            const amount = rng.randInt(brand.amountRange[0], brand.amountRange[1]);
            pastPurchasesArr.push({
              item: rng.choice(brand.purchases),
              amount: amount,
              currency: brand.currency,
              date: new Date(now.getTime() - rng.randInt(10, 300) * 86400000).toISOString()
            });
            clv += amount;
          }
        }

        const daysAgo = rng.randInt(0, 90);
        // Time of day clustering 9am-6pm
        const hours = rng.weightedChoice([
          { value: rng.randInt(9, 18), weight: 80 },
          { value: rng.randInt(19, 23), weight: 15 },
          { value: rng.randInt(0, 8), weight: 5 }
        ]);
        
        const createdAt = new Date(now.getTime() - daysAgo * 86400000);
        createdAt.setUTCHours(hours, rng.randInt(0, 59), 0, 0);

        const lastInteractionDays = rng.next() < 0.7 ? rng.randInt(0, 7) : rng.randInt(8, 60);
        const lastContact = new Date(now.getTime() - lastInteractionDays * 86400000);
        lastContact.setUTCHours(hours, rng.randInt(0, 59), 0, 0);

        const topic = rng.choice(brand.topics);
        const lastMessages = [
          `Can you send the pricing for ${topic}?`,
          `I need more details on ${topic}.`,
          `Thanks, I'll review and get back.`,
          `Let's schedule a call to discuss ${topic}.`,
          `Is ${topic} available right now?`,
          `Perfect, that works for me.`,
          `Can we negotiate on ${topic}?`,
          `What are the next steps?`,
          `Please share a proposal.`,
          `Who should I contact for ${topic}?`,
          `Looking forward to the meeting.`,
          `Not right now, maybe next quarter.`
        ];
        
        let lastMessage = rng.choice(lastMessages);
        if (intent === "emergency") lastMessage = `Urgent issue regarding ${topic}!`;

        const summaryLeadContext = ["VP Sales looking to upgrade", "Procurement manager comparing options", "Founder exploring solutions", "Operations lead with high volume", "Small business owner inquiring", "Enterprise account checking features"][rng.randInt(0, 5)];
        const summaryAction = ["Sent proposal.", "Waiting for reply.", "Scheduled demo.", "Passed to human sales rep.", "Follow up next week.", "Provided initial quote."][rng.randInt(0, 5)];
        const conversationSummary = `${summaryLeadContext}. User asked about ${topic}. ${summaryAction}`;

        const leadId = crypto.randomUUID();

        leads.push({
          id: leadId,
          tenant_id: tenantDbId,
          instance_id: brand.instanceId,
          phone,
          name,
          status: statusChoice,
          source: source,
          source_campaign: campaign,
          created_at: createdAt.toISOString(),
          updated_at: lastContact.toISOString(),
          last_contact: lastContact.toISOString(),
          intent_level: intent,
          lead_score: score,
          treatment_type: topic,
          conversation_summary: conversationSummary,
          last_message: lastMessage,
          current_handler: handler,
          conversation_stage: statusChoice === "won" ? "closed" : "negotiation",
          inquiry_type: "b2b",
          pain_level: rng.randInt(1, 10),
          urgency_score: rng.randInt(1, 10),
          language: lang,
          past_purchases: pastPurchasesArr.length ? pastPurchasesArr : [],
          customer_lifetime_value: clv || 0
        });

        // Messages
        const msgCount = rng.randInt(5, 15);
        for (let m = 0; m < msgCount; m++) {
          messages.push({
            tenant_id: tenantDbId,
            instance_id: brand.instanceId,
            phone,
            body: m === msgCount - 1 ? lastMessage : `Message ${m} regarding ${topic}`,
            sender: m % 2 === 0 ? "user" : "bot",
            timestamp: new Date(createdAt.getTime() + m * 3600000).toISOString()
          });
        }

        // Appointments (total 32)
        if (appointmentCount < 32 && (statusChoice === 'booked-discovery-call' || statusChoice === 'won' || rng.next() < 0.1)) {
          appointmentCount++;
          const slotIso = new Date(now.getTime() + rng.randInt(1, 14) * 86400000);
          slotIso.setUTCHours(rng.randInt(10, 18), 0, 0, 0); // 10am-6pm
          
          appointments.push({
            tenant_id: tenantDbId,
            instance_id: brand.instanceId,
            phone,
            slot_iso: slotIso.toISOString(),
            status: rng.weightedChoice([{value: 'confirmed', weight: 70}, {value: 'pending_confirmation', weight: 20}, {value: 'no_show', weight: 10}]),
            name,
            treatment_type: ["Discovery Call", "Demo", "Quote Walkthrough", "Sample Review", "Pricing Discussion"][rng.randInt(0, 4)],
            slot_human: slotIso.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PKT',
            source_lead_score: score
          });
        }
      }
    }

    // Batch insert Leads
    for (let i = 0; i < leads.length; i += 50) {
      const batch = leads.slice(i, i + 50);
      const { error } = await supabase.from("leads").insert(batch);
      if (error) throw new Error(`Failed to insert leads: ${error.message}`);
    }

    // Batch insert Messages
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      const { error } = await supabase.from("messages").insert(batch);
      if (error) throw new Error(`Failed to insert messages: ${error.message}`);
    }

    // Batch insert Appointments
    if (appointments.length > 0) {
      const { error } = await supabase.from("appointments").insert(appointments);
      if (error) throw new Error(`Failed to insert appointments: ${error.message}`);
    }

    // Insert Knowledge Sources (9 total, 3 per brand)
    const kbEntries = [
      { tenant_id: tenantDbId, type: "flow", label: "Pricing inquiry handler", status: "ready" },
      { tenant_id: tenantDbId, type: "faq", label: "Do you integrate with HubSpot?", status: "ready" },
      { tenant_id: tenantDbId, type: "document", label: "pipelineiq-security-overview.pdf", status: "ready" },
      { tenant_id: tenantDbId, type: "flow", label: "Quote request flow — sea freight", status: "ready" },
      { tenant_id: tenantDbId, type: "website", label: "https://northstar-logistics.example.com", status: "ready" },
      { tenant_id: tenantDbId, type: "faq", label: "What documents do you need for customs clearance?", status: "ready" },
      { tenant_id: tenantDbId, type: "flow", label: "Bulk order intake", status: "ready" },
      { tenant_id: tenantDbId, type: "faq", label: "What's your MOQ for custom-printed boxes?", status: "ready" },
      { tenant_id: tenantDbId, type: "document", label: "metropack-product-catalog-2026.pdf", status: "ready" },
    ];
    
    const { error: kbError } = await supabase.from("knowledge_sources").insert(kbEntries);
    if (kbError) throw new Error(`Failed to insert knowledge base: ${kbError.message}`);

    console.log(`
Demo account ready:
  Email:     ${DEMO_EMAIL}
  Password:  ${DEMO_PASSWORD}
  Slug:      ${TENANT_ID}
  URL:       http://localhost:3000/dashboard/${TENANT_ID}

  Brands:    PipelineIQ (B2B SaaS) · Northstar (Logistics) · MetroPack (Packaging)
  Channels:  3
  Leads:     ${leads.length} (PipelineIQ 60 · Northstar 70 · MetroPack 50)
  Messages:  ~${messages.length}
  Bookings:  ~${appointments.length}
  Knowledge: 9 sources (3 per brand)
`);

    // Verification Script
    console.log("Running Verification Checks...");
    let allPassed = true;

    const check = async (name, condition) => {
      const passed = await condition();
      if (passed) {
        console.log(`[PASS] ${name}`);
      } else {
        console.error(`[FAIL] ${name}`);
        allPassed = false;
      }
    };

    // 1. auth.users contains exactly one user with email
    await check("auth.users contains exactly one demo user", async () => {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      return users.filter(u => u.email === DEMO_EMAIL).length === 1;
    });

    // 2. tenants contains exactly one row with slug 'apex-b2b-demo'
    await check("tenants contains exactly one row with slug 'apex-b2b-demo'", async () => {
      const { count } = await supabase.from("tenants").select("*", { count: "exact", head: true }).eq("slug", "apex-b2b-demo");
      return count === 1;
    });

    // 3. tenant_members contains exactly one row
    await check("tenant_members links user to tenant correctly", async () => {
      const { count } = await supabase.from("tenant_members").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantDbId)
        .eq("user_id", demoUser.id)
        .eq("role", "owner")
        .eq("status", "active");
      return count === 1;
    });

    // 4. whatsapp_instances contains exactly 3 rows
    await check("whatsapp_instances contains exactly 3 rows", async () => {
      const { count } = await supabase.from("whatsapp_instances").select("*", { count: "exact", head: true }).eq("tenant_id", tenantDbId);
      return count === 3;
    });

    // 5. leads contains exactly 180 rows
    await check("leads contains exactly 180 rows", async () => {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("tenant_id", tenantDbId);
      return count === 180;
    });

    // 6. At least 40 leads have non-empty past_purchases
    await check("At least 40 leads have non-empty past_purchases JSON", async () => {
      const { count } = await supabase.from("leads").select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantDbId)
        .not("past_purchases", "is", null);
      return count >= 40;
    });

    // 7. ZERO leads contain dental strings
    await check("ZERO leads contain dental keywords", async () => {
      const { data } = await supabase.from("leads").select("name, last_message, conversation_summary").eq("tenant_id", tenantDbId);
      for (const lead of data) {
        const textToSearch = `${lead.name} ${lead.last_message} ${lead.conversation_summary}`.toLowerCase();
        if (textToSearch.includes("invisalign") || textToSearch.includes("dental") || textToSearch.includes("teeth") || textToSearch.includes("orthodontic") || textToSearch.includes("crown") || textToSearch.includes("filling")) {
          return false;
        }
      }
      return true;
    });

    if (!allPassed) {
      console.error("\nERROR: Verification failed! Do not proceed until all checks pass.");
      process.exit(1);
    } else {
      console.log("\nAll verification checks PASSED!");
    }

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
