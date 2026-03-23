import { NextResponse } from 'next/server';
import { loadThreads } from '@/lib/store';

export async function GET() {
  try {
    const threads = await loadThreads();
    const sorted = threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ threads: sorted });
  } catch (error) {
    console.error('Failed to get threads', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
