import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";
import { buildStats, parseFilters } from "@/lib/dashboard-utils";
import { getClient, getClientStatsUrl } from "@/lib/clients";

export async function GET(request, { params }) {
  const { slug } = params;

  // Reject unknown clients
  if (!getClient(slug)) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  // n8n webhook mode (per-client)
  const webhookUrl = getClientStatsUrl(slug);
  if (webhookUrl) {
    const upstream = await fetch(
      `${webhookUrl}?${request.nextUrl.searchParams.toString()}`,
      { next: { revalidate: 60 } },
    );
    return NextResponse.json(await upstream.json());
  }

  const data = await getDashboardData(slug);
  if (!data) return NextResponse.json({ error: "No data source configured" }, { status: 500 });

  const filters = parseFilters(request.nextUrl.searchParams);
  const stats   = buildStats(data, filters);

  return NextResponse.json(stats);
}
