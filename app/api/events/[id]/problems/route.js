import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to validate UUID
const isValidUUID = (id) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

// POST: Create a new problem statement
export async function POST(request, { params }) {
  const { id: eventId } = params;

  if (!eventId || !isValidUUID(eventId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Event ID format' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Auth Check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, max_selections } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('problem_statements')
      .insert({
        event_id: eventId,
        title,
        description,
        max_selections: max_selections || 1
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, problem: data });
  } catch (error) {
    console.error('Error creating problem statement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
