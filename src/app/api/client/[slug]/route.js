import { NextResponse } from "next/server";
import { getClient } from "@/lib/clients";

export async function GET(request, { params }) {
  const client = getClient(params.slug);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return ONLY public fields — never expose secrets
  return NextResponse.json({
    slug:    client.slug,
    name:    client.name,
    logo:    client.logo,
    tagline: client.tagline,
  });
}
