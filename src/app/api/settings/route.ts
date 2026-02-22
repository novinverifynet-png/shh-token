import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-check';

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const [rows] = await pool.query('SELECT * FROM settings ORDER BY id ASC');
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('[Settings GET]', err?.message);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { key_name, key_value } = await req.json();
    if (!key_name || key_value === undefined) {
      return NextResponse.json({ success: false, error: 'key_name and key_value required' }, { status: 400 });
    }
    await pool.query('UPDATE settings SET key_value = ? WHERE key_name = ?', [key_value, key_name]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Settings PUT]', err?.message);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
