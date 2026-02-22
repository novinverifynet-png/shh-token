import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-check';

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const [rows] = await pool.query('SELECT * FROM wallets ORDER BY connected_at DESC');
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // This endpoint is called from landing page (no auth needed - public)
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });

    await pool.query(
      `INSERT INTO wallets (address, is_connected, connected_at)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE is_connected = 1, connected_at = NOW()`,
      [address.toLowerCase()]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
