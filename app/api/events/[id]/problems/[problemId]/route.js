import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to validate UUID
const isValidUUID = (id) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

// DELETE: Remove a problem statement
export async function DELETE(request, { params }) {
  const { id: eventId, problemId } = params;

  if (!eventId || !isValidUUID(eventId) || !problemId || !isValidUUID(problemId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid ID format' },
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
    // Optional: Verify the problem belongs to the event (extra safety)
    // The simplified query below just deletes by ID, which is usually sufficient if RLS is on or if we trust the ID.
    // However, ensuring it matches the event_id is good practice.

    const { error } = await supabase
      .from('problem_statements')
      .delete()
      .eq('id', problemId)
      .eq('event_id', eventId); // Ensure it belongs to this event

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting problem statement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update a problem statement
export async function PUT(request, { params }) {
  const { id: eventId, problemId } = params;

  if (!eventId || !isValidUUID(eventId) || !problemId || !isValidUUID(problemId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid ID format' },
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

    // Validation
    if (!title) {
        return NextResponse.json(
            { success: false, error: 'Title is required' },
            { status: 400 }
        );
    }

    const updates = {
        title,
        description,
        max_selections: max_selections || 1,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('problem_statements')
      .update(updates)
      .eq('id', problemId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating problem statement:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
