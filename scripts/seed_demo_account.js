require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TENANT_ID = "apex-marketing-demo";

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
}

const FIRST_NAMES = ["Ali", "Sara", "Omer", "Fatima", "Hassan", "Ayesha", "Zain", "Sana", "Bilal", "Hira", "Usman", "Nida", "Raza", "Mahnoor"];
const LAST_NAMES = ["Khan", "Ahmed", "Syed", "Qureshi", "Malik", "Sheikh", "Shah", "Baig"];
const TREATMENTS = ["Invisalign", "Teeth Whitening", "Root Canal", "Routine Checkup", "Dental Implants", "Braces"];
const INTENTS = ["hot", "hot", "warm", "warm", "warm", "cold", "cold"];
const SOURCES = ["facebook", "instagram", "google", "organic"];

function generateFakePhone(rng) {
  const prefixes = ["0300", "0311", "0321", "0333", "0345", "0301", "0312", "0322", "0334"];
  const prefix = rng.choice(prefixes);
  const number = rng.randInt(1000000, 9999999);
  return `+92${prefix.substring(1)}${number}`;
}

function generateDemoData(tenantId, instanceId, seedValue = 12345) {
  const rng = new PRNG(seedValue);
  
  const kbEntries = [
    { tenant_id: tenantId, instance_id: instanceId, question: "What are your hours?", answer: "We are open 9 AM to 9 PM, Monday to Saturday." },
    { tenant_id: tenantId, instance_id: instanceId, question: "Where are you located?", answer: "We are located at DHA Phase 6, Karachi." },
    { tenant_id: tenantId, instance_id: instanceId, question: "How much is teeth whitening?", answer: "Our laser teeth whitening starts at Rs.15,000." },
    { tenant_id: tenantId, instance_id: instanceId, question: "Do you do Invisalign?", answer: "Yes! Invisalign treatments start at Rs.200,000. Book a free scan to get an exact quote." },
    { tenant_id: tenantId, instance_id: instanceId, question: "Is there a consultation fee?", answer: "Our basic checkup fee is Rs.1,000." },
    { tenant_id: tenantId, instance_id: instanceId, question: "Do you accept credit cards?", answer: "Yes, we accept Visa, Mastercard, and JazzCash/EasyPaisa." }
  ];

  const leads = [];
  const messages = [];
  const appointments = [];

  // Fixed now value for deterministic outputs
  const now = new Date("2026-05-01T12:00:00Z");
  
  for (let i = 0; i < 180; i++) {
    const phone = generateFakePhone(rng);
    const name = `${rng.choice(FIRST_NAMES)} ${rng.choice(LAST_NAMES)}`;
    const isBooked = rng.next() > 0.7; // 30% booked
    const intent = rng.choice(INTENTS);
    const score = isBooked ? rng.randInt(80, 100) : (intent === "hot" ? rng.randInt(60, 80) : rng.randInt(10, 50));
    const treatment = rng.choice(TREATMENTS);
    
    // Spread dates over the last 30 days
    const daysAgo = rng.randInt(0, 30);
    const createdAt = new Date(now.getTime() - daysAgo * 86400000 - rng.randInt(0, 86400000));
    const lastContact = new Date(createdAt.getTime() + rng.randInt(0, 86400000));

    leads.push({
      tenant_id: tenantId,
      instance_id: instanceId,
      phone,
      name,
      status: isBooked ? "booked" : (intent === "hot" ? "qualified" : "contacted"),
      source: rng.choice(SOURCES),
      created_at: createdAt.toISOString(),
      updated_at: lastContact.toISOString(),
      last_contact: lastContact.toISOString(),
      intent,
      score,
      treatment_type: treatment,
      conversation_summary: `User asked about ${treatment}. Quoted standard rates.`,
      last_message: isBooked ? "See you then!" : "Let me think about it.",
      appointment_time: isBooked ? new Date(lastContact.getTime() + rng.randInt(1, 5) * 86400000).toISOString() : null,
      current_handler: isBooked ? "human" : "bot"
    });

    if (isBooked) {
      appointments.push({
        tenant_id: tenantId,
        instance_id: instanceId,
        phone,
        slot_iso: new Date(lastContact.getTime() + rng.randInt(1, 5) * 86400000).toISOString(),
        status: "booked",
        created_at: createdAt.toISOString()
      });
    }

    // Generate ~8 messages per lead on average (1500 total approx)
    const msgCount = rng.randInt(2, 14);
    let msgTime = createdAt;
    for (let m = 0; m < msgCount; m++) {
      const isUser = m % 2 === 0;
      messages.push({
        tenant_id: tenantId,
        instance_id: instanceId,
        phone,
        sender: isUser ? "user" : "bot",
        body: isUser ? `Question about ${treatment}...` : `Our ${treatment} is very popular.`,
        timestamp: msgTime.toISOString()
      });
      msgTime = new Date(msgTime.getTime() + rng.randInt(1000, 3600000)); // add 1sec to 1hr
    }
  }
  
  return { kbEntries, leads, messages, appointments };
}

module.exports = { PRNG, generateFakePhone, generateDemoData };

async function seed() {
  console.log(`Seeding demo data for tenant: ${TENANT_ID}`);

  // 1. Clean existing data (Idempotency)
  console.log("Cleaning existing data...");
  await supabase.from("messages").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("appointments").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("leads").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("knowledge_base").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("whatsapp_instances").delete().eq("tenant_id", TENANT_ID);
  await supabase.from("tenants").delete().eq("id", TENANT_ID);

  // 2. Create Tenant
  await supabase.from("tenants").insert({
    id: TENANT_ID,
    name: "Apex Marketing",
    timezone: "Asia/Karachi",
    meta: {
      name: "Apex Dental Setup",
      logo: "🦷",
      tagline: "Demo Account"
    }
  });

  // 3. Create Instance
  const { data: instance } = await supabase.from("whatsapp_instances").insert({
    tenant_id: TENANT_ID,
    label: "Main Clinic WhatsApp",
    phone_number: "+923001234567",
    status: "connected"
  }).select().single();

  const instanceId = instance.id;

  // 4. Create Knowledge Base
  const kbEntries = [
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "What are your hours?", answer: "We are open 9 AM to 9 PM, Monday to Saturday." },
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "Where are you located?", answer: "We are located at DHA Phase 6, Karachi." },
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "How much is teeth whitening?", answer: "Our laser teeth whitening starts at Rs.15,000." },
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "Do you do Invisalign?", answer: "Yes! Invisalign treatments start at Rs.200,000. Book a free scan to get an exact quote." },
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "Is there a consultation fee?", answer: "Our basic checkup fee is Rs.1,000." },
    { tenant_id: TENANT_ID, instance_id: instanceId, question: "Do you accept credit cards?", answer: "Yes, we accept Visa, Mastercard, and JazzCash/EasyPaisa." }
  ];
  await supabase.from("knowledge_base").insert(kbEntries);

  // 5. Generate Leads, Appointments, Messages
  console.log("Generating 180 leads...");
  const leads = [];
  const messages = [];
  const appointments = [];

  const now = new Date();
  
  for (let i = 0; i < 180; i++) {
    const phone = generateFakePhone();
    const name = `${rng.choice(FIRST_NAMES)} ${rng.choice(LAST_NAMES)}`;
    const isBooked = rng.next() > 0.7; // 30% booked
    const intent = rng.choice(INTENTS);
    const score = isBooked ? rng.randInt(80, 100) : (intent === "hot" ? rng.randInt(60, 80) : rng.randInt(10, 50));
    const treatment = rng.choice(TREATMENTS);
    
    // Spread dates over the last 30 days
    const daysAgo = rng.randInt(0, 30);
    const createdAt = new Date(now.getTime() - daysAgo * 86400000 - rng.randInt(0, 86400000));
    const lastContact = new Date(createdAt.getTime() + rng.randInt(0, 86400000));

    leads.push({
      tenant_id: TENANT_ID,
      instance_id: instanceId,
      phone,
      name,
      status: isBooked ? "booked" : (intent === "hot" ? "qualified" : "contacted"),
      source: rng.choice(SOURCES),
      created_at: createdAt.toISOString(),
      updated_at: lastContact.toISOString(),
      last_contact: lastContact.toISOString(),
      intent,
      score,
      treatment_type: treatment,
      conversation_summary: `User asked about ${treatment}. Quoted standard rates.`,
      last_message: isBooked ? "See you then!" : "Let me think about it.",
      appointment_time: isBooked ? new Date(lastContact.getTime() + rng.randInt(1, 5) * 86400000).toISOString() : null,
      current_handler: isBooked ? "human" : "bot"
    });

    if (isBooked) {
      appointments.push({
        tenant_id: TENANT_ID,
        instance_id: instanceId,
        phone,
        slot_iso: new Date(lastContact.getTime() + rng.randInt(1, 5) * 86400000).toISOString(),
        status: "booked",
        created_at: createdAt.toISOString()
      });
    }

    // Generate ~8 messages per lead on average (1500 total approx)
    const msgCount = rng.randInt(2, 14);
    let msgTime = createdAt;
    for (let m = 0; m < msgCount; m++) {
      const isUser = m % 2 === 0;
      messages.push({
        tenant_id: TENANT_ID,
        instance_id: instanceId,
        phone,
        sender: isUser ? "user" : "bot",
        body: isUser ? `Question about ${treatment}...` : `Our ${treatment} is very popular.`,
        timestamp: msgTime.toISOString()
      });
      msgTime = new Date(msgTime.getTime() + rng.randInt(1000, 3600000)); // add 1sec to 1hr
    }
  }

  // Insert in chunks to avoid payload limits
  const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];

  for (const chunk of chunkArray(leads, 50)) {
    await supabase.from("leads").insert(chunk);
  }
  for (const chunk of chunkArray(appointments, 50)) {
    await supabase.from("appointments").insert(chunk);
  }
  for (const chunk of chunkArray(messages, 200)) {
    await supabase.from("messages").insert(chunk);
  }

  console.log(`Seeded ${leads.length} leads, ${appointments.length} appointments, and ${messages.length} messages.`);
  
  // Spot check 10 random leads
  console.log("\n--- Spot Check (10 random leads) ---");
  for(let i = 0; i < 10; i++) {
    const l = leads[rng.randInt(0, leads.length - 1)];
    console.log(`- ${l.name} (${l.phone}): [${l.intent.toUpperCase()}, Score ${l.score}] ${l.treatment_type}. Booked? ${l.status === 'booked'}`);
  }
}

seed().catch(console.error);
