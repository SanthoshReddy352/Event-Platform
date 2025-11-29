import Razorpay from "razorpay";
import { NextResponse } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
  try {
    const { amount, eventId } = await request.json();

    if (!amount || !eventId) {
      return NextResponse.json({ error: "Amount and Event ID required" }, { status: 400 });
    }

    // Razorpay accepts amount in subunits (Paisa for INR)
    // 100 INR = 10000 Paisa
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `rcpt_${eventId}_${Date.now().toString().slice(-10)}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}