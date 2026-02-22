// app/api/transfer/balances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { requireAuth } from '@/lib/auth-check';
import { getProvider } from '@/lib/rpc';

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
] as const;

export async function POST(req: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { walletAddress, tokens, chainId } = await req.json();
        if (!walletAddress || !tokens?.length || !chainId) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        const provider = getProvider(chainId); // staticNetwork — بدون retry loop

        const results = await Promise.allSettled(
            tokens.map(async (tokenAddress: string) => {
                const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
                const [balance, decimals] = await Promise.all([
                    contract.balanceOf(walletAddress),
                    contract.decimals(),
                ]);
                return {
                    tokenAddress: tokenAddress.toLowerCase(),
                    balance: ethers.formatUnits(balance, decimals),
                };
            })
        );

        const balances: Record<string, string> = {};
        results.forEach(r => {
            if (r.status === 'fulfilled') balances[r.value.tokenAddress] = r.value.balance;
        });

        return NextResponse.json({ success: true, balances });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
}