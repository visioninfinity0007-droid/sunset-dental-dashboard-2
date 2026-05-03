import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { id } = params;
  const supabase = createClient(cookies());
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
