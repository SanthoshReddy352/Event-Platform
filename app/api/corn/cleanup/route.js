import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const now = new Date().toISOString();
  try {
    // Find events that have ended
    const { data: completedEventIds } = await supabaseAdmin
      .from("events")
      .select("id")
      .lt("event_end_date", now);

    if (completedEventIds && completedEventIds.length > 0) {
      // Bulk delete pending participants
      const { error } = await supabaseAdmin
        .from("participants")
        .delete()
        .eq("status", "pending")
        .in("event_id", completedEventIds.map((e) => e.id));

      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        message: `Cleaned up ${completedEventIds.length} events.` 
      });
    }
    return NextResponse.json({ success: true, message: "No events to clean." });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}