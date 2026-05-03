import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get("instanceName");
    if (!instanceName) return NextResponse.json({ error: "Missing instance name" }, { status: 400 });

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    // 1. Check connection status
    const statusRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey }
    });
    
    if (!statusRes.ok) {
      // If instance doesn't exist yet, return pending
      if (statusRes.status === 404) return NextResponse.json({ status: "pending" });
      throw new Error("Failed to check connection state");
    }
    
    const statusData = await statusRes.json();
    const connectionState = statusData.instance?.state || statusData.state;

    if (connectionState === "open" || connectionState === "connected") {
      return NextResponse.json({ status: "connected" });
    }

    // 2. Get QR code if not connected
    const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey }
    });

    if (!qrRes.ok) {
      return NextResponse.json({ status: "pending" });
    }

    const qrData = await qrRes.json();
    // Evolution API returns QR base64 or code
    return NextResponse.json({ 
      status: "qr_ready",
      qrcode: qrData.base64 || qrData.code || null 
    });

  } catch (err) {
    console.error("QR status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
