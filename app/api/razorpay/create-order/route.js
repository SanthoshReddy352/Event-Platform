import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { eventId, userId } = await request.json(); // Accept userId to bind order to user

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    // 1. Fetch Event Details (Fee & Creator)
    // SECURITY: We fetch the fee from DB. We do NOT trust the 'amount' from client.
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("created_by, registration_fee, title")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 2. Fetch the Club's Razorpay Keys
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("razorpay_key_id, razorpay_key_secret")
      .eq("user_id", eventData.created_by)
      .single();

    if (
      adminError ||
      !adminData ||
      !adminData.razorpay_key_id ||
      !adminData.razorpay_key_secret
    ) {
      return NextResponse.json(
        { error: "Payment gateway not configured for this club." },
        { status: 400 }
      );
    }

    // 3. Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: adminData.razorpay_key_id,
      key_secret: adminData.razorpay_key_secret,
    });

    // 4. Create Order
    const amount = eventData.registration_fee || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: "This is a free event." }, { status: 400 });
    }

    const cleanEventId = eventId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    const receiptId = `rcpt_${cleanEventId}_${Date.now().toString().slice(-8)}`;
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paisa
      currency: "INR",
      receipt: receiptId,
      notes: {
        event_id: eventId,
        user_id: userId, // Meta-data for tracking
        event_title: eventData.title.slice(0, 30)
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      ...order,
      key_id: adminData.razorpay_key_id, // Send Key ID to frontend
    });

  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}