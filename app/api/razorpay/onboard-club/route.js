import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initialize Supabase Admin Client
// Required to fetch email from auth.users and write to admin_users securely
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // 1. Fetch Admin Profile (Bank Details)
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
    }

    // Check if bank details exist
    if (!adminData.bank_account_no || !adminData.bank_ifsc) {
      return NextResponse.json({ error: "Bank details missing. Please save them first." }, { status: 400 });
    }

    // Check if already linked
    if (adminData.razorpay_account_id) {
      return NextResponse.json({ 
        success: true, 
        message: "Account already linked", 
        accountId: adminData.razorpay_account_id 
      });
    }

    // 2. Fetch User Email (from Auth)
    // We need the email for Razorpay onboarding
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Auth user not found" }, { status: 404 });
    }
    
    const userEmail = userData.user.email;

    // 3. Create Linked Account on Razorpay
    const accountData = {
      type: "route",
      name: adminData.club_name || adminData.bank_holder_name,
      email: userEmail,
      legal_business_name: adminData.bank_holder_name,
      business_type: "individual", // Defaulting to individual for simplicity
      contact_name: adminData.bank_holder_name,
      profile: {
        category: "events",
        addresses: {
          registered: {
            street1: "Club Address", // You might want to add address fields to your DB later
            city: "City",
            state: "State",
            postal_code: "123456",
            country: "IN",
          },
        },
      },
      bank_account: {
        ifsc_code: adminData.bank_ifsc,
        account_number: adminData.bank_account_no,
        beneficiary_name: adminData.bank_holder_name,
      },
    };

    const razorpayAccount = await razorpay.accounts.create(accountData);

    // 4. Save the razorpay_account_id back to Supabase
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ razorpay_account_id: razorpayAccount.id })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to save Account ID:", updateError);
      return NextResponse.json({ error: "Linked on Razorpay but DB update failed" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Club successfully onboarded to Razorpay",
      accountId: razorpayAccount.id 
    });

  } catch (error) {
    console.error("Onboarding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}