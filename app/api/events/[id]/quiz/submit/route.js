import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET
);

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

// POST /api/events/[id]/quiz/submit
export async function POST(request, { params }) {
  try {
    const eventId = params.id;
    const { user, error: authError } = await verifyAuth(request);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { answers } = body; // Map: question_id -> selected_option_index

    // 1. Fetch all questions with correct answers
    const { data: questions, error: qError } = await supabaseAdmin
      .from("quiz_questions")
      .select("id, correct_option_index, points")
      .eq("event_id", eventId);

    if (qError) throw qError;

    // 2. Calculate Score
    let totalScore = 0;
    let maxScore = 0;
    
    questions.forEach((q) => {
      maxScore += (q.points || 1);
      if (answers[q.id] === q.correct_option_index) {
        totalScore += (q.points || 1);
      }
    });

    // 3. Record Attempt
    // 3. Record Attempt
    // Check for existing attempt first
    const { data: existingAttempt } = await supabaseAdmin
      .from("quiz_attempts")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    let attempt;
    const payload = {
      event_id: eventId,
      user_id: user.id,
      score: totalScore,
      answers: answers,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    if (existingAttempt) {
      const { data, error } = await supabaseAdmin
        .from("quiz_attempts")
        .update(payload)
        .eq("id", existingAttempt.id)
        .select()
        .single();
      if (error) throw error;
      attempt = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("quiz_attempts")
        .insert([{
          ...payload,
          started_at: body.started_at || new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      attempt = data;
    }



    return NextResponse.json({
      success: true,
      score: totalScore,
      maxScore: maxScore,
      attemptId: attempt.id,
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
