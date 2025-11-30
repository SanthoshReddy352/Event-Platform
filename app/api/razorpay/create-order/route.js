import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    // 1. Fetch Event and Admin Details to find the destination account
    // We join events -> created_by (user_id) -> admin_users (razorpay_account_id)
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      throw new Error("Event not found");
    }

    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("razorpay_account_id")
      .eq("user_id", eventData.created_by)
      .single();

    // 2. Prepare Receipt ID
    const cleanEventId = eventId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    const receiptId = `rcpt_${cleanEventId}_${Date.now().toString().slice(-10)}`;

    const amountInPaisa = Math.round(amount * 100);

    const options = {
      amount: amountInPaisa,
      currency: "INR",
      receipt: receiptId,
    };

    // 3. Add Transfer Logic (Automated Split)
    // Only if the admin has a linked account ID, otherwise money stays in your main account
    if (adminData && adminData.razorpay_account_id) {
      options.transfers = [
        {
          account: adminData.razorpay_account_id, // The Linked Account ID (e.g., acc_12345678)
          amount: amountInPaisa, // Transfer full amount
          currency: "INR",
          notes: {
            event_id: eventId, // Useful for tracking
          },
          linked_account_notes: [
            "event_id" // Passes this note to the linked account's dashboard
          ],
          on_hold: 0, // 1 = settle manually later, 0 = settle immediately
        },
      ];
      
      // OPTIONAL: If you want to keep a platform fee (e.g., 5%)
      // const platformFee = Math.round(amountInPaisa * 0.05);
      // options.transfers[0].amount = amountInPaisa - platformFee;
    }

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}