import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";
import { buildLeadsPayload, parseFilters } from "@/lib/dashboard-utils";
import { getClient, getClientLeadsUrl } from "@/lib/clients";

export async function GET(request, { params }) {
  const { slug } = params;

  if (!getClient(slug)) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  const webhookUrl = getClientLeadsUrl(slug);
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
  const payload = buildLeadsPayload(data, filters);

  return NextResponse.json(payload);
}
