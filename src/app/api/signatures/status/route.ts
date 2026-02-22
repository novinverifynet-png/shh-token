// app/api/signatures/status/route.ts
// چک میکنه برای یه wallet آیا signature active داره یا نه
// به تفکیک chain_id و نوع (erc20 / native)
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ success: false, error: 'wallet required' }, { status: 400 });

    try {
        const [rows]: any = await pool.query(
            `SELECT chain_id, COUNT(*) as count
       FROM signatures
       WHERE wallet_address = ? AND is_active = 1
       GROUP BY chain_id`,
            [wallet.toLowerCase()]
        );

        // { "1": true, "137": true, ... }
        const signed: Record<string, boolean> = {};
        for (const row of rows) signed[row.chain_id] = row.count > 0;

        return NextResponse.json({ success: true, signed });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}