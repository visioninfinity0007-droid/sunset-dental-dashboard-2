import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { slug } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const [leadsRes, channelsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('tenant_id', tenant.id),
      supabase.from('whatsapp_instances').select('id, label, whatsapp_phone').eq('tenant_id', tenant.id)
    ]);

    const leads = leadsRes.data || [];
    const channels = channelsRes.data || [];

    // Calculations
    const totalLeads = leads.length;
    const bookedLeads = leads.filter(l => l.status === 'booked' || l.status === 'appointment_booked').length;
    const conversionRate = totalLeads ? Math.round((bookedLeads / totalLeads) * 100) : 0;

    // Intent breakdown
    const intentCounts = leads.reduce((acc, l) => {
      const intent = l.intent || 'cold';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});
    const intents = Object.keys(intentCounts).map(k => ({ name: k, value: intentCounts[k] }));

    // Weekly volume (last 8 weeks)
    const weeksMap = {};
    const now = new Date();
    // Initialize last 8 weeks
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - (d.getDay() || 7) + 1); // Get Monday of current week
      d.setDate(d.getDate() - (i * 7));
      const weekKey = d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      weeksMap[weekKey] = {
        name: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        timestamp: d.getTime(),
        leads: 0
      };
    }

    leads.forEach(l => {
      const cd = new Date(l.created_at);
      cd.setDate(cd.getDate() - (cd.getDay() || 7) + 1);
      const key = cd.toISOString().split('T')[0];
      if (weeksMap[key]) {
        weeksMap[key].leads++;
      }
    });

    const volumeTrend = Object.values(weeksMap).sort((a, b) => a.timestamp - b.timestamp);

    return NextResponse.json({
      kpis: {
        totalLeads,
        bookedLeads,
        conversionRate,
      },
      intents,
      volumeTrend,
      channels: channels.map(c => ({
        ...c,
        leads_count: leads.filter(l => l.instance_id === c.id).length
      }))
    });
  } catch(err) {
    console.error("Analytics GET error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
