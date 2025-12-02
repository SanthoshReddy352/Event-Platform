import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { jwtVerify } from "jose";

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET
);

// Helper: Verify Auth
async function verifyAuth(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing token" };
  }
  const token = authHeader.split(" ")[1];
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { user: { id: payload.sub, email: payload.email }, error: null };
  } catch (err) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { user: null, error: "Invalid token" };
    return { user, error: null };
  }
}

// Helper: Check Admin Role
async function getAdminRole(userId) {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.role;
}

// GET /api/events/[id]/quiz
// Fetches questions for the quiz.
export async function GET(request, { params }) {
  try {
    const eventId = params.id;
    const { user, error: authError } = await verifyAuth(request);

    // Determine if user is admin
    let isAdmin = false;
    if (user) {
      const role = await getAdminRole(user.id);
      isAdmin = !!role;
    }

    // Fetch questions
    const { data: questions, error } = await supabaseAdmin
      .from("quiz_questions")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Check for existing attempt
    let attempt = null;
    if (user) {
      const { data: existingAttempt } = await supabaseAdmin
        .from("quiz_attempts")
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      attempt = existingAttempt;
    }

    // If not admin, hide correct answers
    const sanitizedQuestions = isAdmin
      ? questions
      : questions.map((q) => {
          const { correct_option_index, ...rest } = q;
          return rest;
        });

    return NextResponse.json({ 
        success: true, 
        questions: sanitizedQuestions,
        attempted: !!attempt,
        previousAttempt: attempt 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/events/[id]/quiz
// Admin: Add/Update questions
export async function POST(request, { params }) {
  try {
    const eventId = params.id;
    const { user, error: authError } = await verifyAuth(request);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = await getAdminRole(user.id);
    if (!role) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, question } = body;

    if (action === "create") {
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .insert([{ ...question, event_id: eventId }])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, question: data });
    }

    if (action === "update") {
      const { id, ...updates } = question;
      const { data, error } = await supabaseAdmin
        .from("quiz_questions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, question: data });
    }

    if (action === "delete") {
      const { id } = question;
      const { error } = await supabaseAdmin
        .from("quiz_questions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
