import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client (to read admin_users table securely)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { amount, eventId } = await request.json();

    if (!amount || !eventId) {
      return NextResponse.json({ error: "Amount and Event ID required" }, { status: 400 });
    }

    // 1. Fetch Event Creator to find the correct Razorpay Keys
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error("Event not found");
    }

    // 2. Fetch the Club's Razorpay Keys
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("razorpay_key_id, razorpay_key_secret")
      .eq("user_id", eventData.created_by)
      .single();

    if (adminError || !adminData || !adminData.razorpay_key_id || !adminData.razorpay_key_secret) {
        return NextResponse.json({ 
            error: "Payment is not set up for this event. Please contact the organizer." 
        }, { status: 400 });
    }

    // 3. Initialize Razorpay instance with the CLUB'S credentials
    const razorpay = new Razorpay({
      key_id: adminData.razorpay_key_id,
      key_secret: adminData.razorpay_key_secret,
    });

    // 4. Create Order
    const cleanEventId = eventId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    const receiptId = `rcpt_${cleanEventId}_${Date.now().toString().slice(-10)}`;
    const amountInPaisa = Math.round(amount * 100);

    const options = {
      amount: amountInPaisa,
      currency: "INR",
      receipt: receiptId,
      notes: {
          event_id: eventId 
      }
    };

    const order = await razorpay.orders.create(options);

    // 5. Return Order details AND the correct Key ID to the frontend
    // The frontend needs the Key ID to open the payment modal.
    return NextResponse.json({
        ...order,
        key_id: adminData.razorpay_key_id 
    });

  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}