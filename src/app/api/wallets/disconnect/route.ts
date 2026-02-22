import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Public endpoint - called from landing page
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address) return NextResponse.json({ success: false, error: 'Address required' }, { status: 400 });

    await pool.query('UPDATE wallets SET is_connected = 0 WHERE address = ?', [address.toLowerCase()]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
