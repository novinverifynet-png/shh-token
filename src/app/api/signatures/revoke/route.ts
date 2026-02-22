// app/api/signatures/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-check';

export async function POST(req: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { ids } = await req.json();
        if (!ids || !ids.length) {
            return NextResponse.json({ success: false, error: 'No ids provided' }, { status: 400 });
        }

        const placeholders = ids.map(() => '?').join(',');
        await pool.query(
            `UPDATE signatures SET is_active = 0 WHERE id IN (${placeholders})`,
            ids
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}