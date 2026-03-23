import { NextRequest, NextResponse } from 'next/server';
import { loadMessages } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const messages = await loadMessages(threadId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to get thread', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
