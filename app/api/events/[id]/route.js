import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to validate UUID
const isValidUUID = (id) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

// GET: Fetch a single event by ID
export async function GET(request, { params }) {
  const { id } = params;

  // 1. Validate ID Format
  if (!id || id === 'undefined' || !isValidUUID(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Event ID format' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an event by ID
export async function PUT(request, { params }) {
  const { id } = params;

  if (!id || id === 'undefined' || !isValidUUID(id)) {
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

    const { data, error } = await supabase
      .from('events')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, event: data });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an event
export async function DELETE(request, { params }) {
    const { id } = params;
  
    if (!id || id === 'undefined' || !isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Event ID format' },
        { status: 400 }
      );
    }
  
    const supabase = createClient();
  
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}