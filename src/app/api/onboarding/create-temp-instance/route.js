import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionUrl || !apiKey) {
      throw new Error("Evolution API not configured");
    }

    // Create a temporary instance name based on user ID
    const instanceName = `temp_onb_${user.id.substring(0, 8)}_${Math.random().toString(16).substring(2, 6)}`;

    const res = await fetch(`${evolutionUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      }),
    });

    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Evolution create failed: ${errData}`);
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, instanceName });
  } catch (err) {
    console.error("Temp instance error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
