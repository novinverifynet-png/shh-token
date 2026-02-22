import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
