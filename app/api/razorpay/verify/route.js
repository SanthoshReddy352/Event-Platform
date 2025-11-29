import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
// We use SERVICE_ROLE_KEY to ensure we can write to the participants table
// regardless of RLS, as this is a server-side verified transaction.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      userId,
      userDetails,
      responses
    } = await request.json();

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
        return NextResponse.json(
            { success: false, message: "Invalid Signature" },
            { status: 400 }
        );
    }

    // 2. Add to Participants Table
    const { error } = await supabase.from("participants").insert([
      {
        event_id: eventId,
        user_id: userId, 
        // We store the responses (form data) here
        responses: responses || {},
        status: 'approved', // Auto-approve paid events
        
        // Payment Details
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        payment_status: 'paid'
      },
    ]);

    if (error) {
        console.error("DB Error:", error);
        return NextResponse.json({ success: false, message: "Payment verified but DB registration failed. Contact Admin." });
    }

    return NextResponse.json({ success: true, message: "Payment verified and registered" });

  } catch (error) {
      console.error("Verification Error:", error);
      return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}