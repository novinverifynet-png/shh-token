// app/api/signatures/tokens/route.ts
// برمیگردونه آدرس توکن‌هایی که قبلاً برای این wallet و chain ذخیره شدن
// این برای Request button استفاده میشه تا بدونیم چه توکن‌هایی باید permit بشن
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const chainId = searchParams.get('chainId');

    if (!wallet || !chainId) {
        return NextResponse.json({ success: false, error: 'wallet and chainId required' }, { status: 400 });
    }

    try {
        // توکن‌هایی که قبلاً داشته (از assets که Moralis گرفته)
        // اگه تو signatures داشتیم ازونجا میخونیم
        // وگرنه باید از wallets/{id} بگیریم
        const [rows]: any = await pool.query(
            `SELECT DISTINCT token_address as address, token_symbol as symbol, 
              token_name as name, token_decimals as decimals
       FROM signatures 
       WHERE wallet_address = ? AND chain_id = ?
       LIMIT 20`,
            [wallet.toLowerCase(), chainId]
        );

        // اگه تو signatures نبود، از assets بگیر
        if (!rows.length) {
            // اینجا میتونیم از Moralis cache که تو DB داریم بخونیم
            // فعلاً empty برمیگردونیم و frontend باید handle کنه
            return NextResponse.json({ success: true, tokens: [], fromHistory: false });
        }

        return NextResponse.json({ success: true, tokens: rows, fromHistory: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}