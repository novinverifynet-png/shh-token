import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { requireAuth } from '@/lib/auth-check';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const [rows]: any = await pool.query('SELECT * FROM wallets WHERE id = ?', [params.id]);
    if (!rows.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const wallet = rows[0];
    const assets = await fetchAssets(wallet.address);
    const totalUsdt = calcTotalUsdt(assets);
    return NextResponse.json({ success: true, data: { ...wallet, assets, total_usdt: totalUsdt } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const [rows]: any = await pool.query('SELECT address FROM wallets WHERE id = ?', [params.id]);
    if (!rows.length) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    const assets = await fetchAssets(rows[0].address);
    const totalUsdt = calcTotalUsdt(assets);
    await pool.query('UPDATE wallets SET balance_usdt = ?, updated_at = NOW() WHERE id = ?', [totalUsdt, params.id]);
    return NextResponse.json({ success: true, balance_usdt: totalUsdt });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    await pool.query('DELETE FROM wallets WHERE id = ?', [params.id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

// ─── Chain definitions ────────────────────────────────────────────────────────

const CHAINS = [
  { id: '0x1', label: 'Ethereum', category: 'erc20' as const, nativeSymbol: 'ETH', nativeName: 'Ethereum', wrappedAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: '0x89', label: 'Polygon', category: 'erc20' as const, nativeSymbol: 'POL', nativeName: 'Polygon', wrappedAddr: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', nativeLogo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  { id: '0xa4b1', label: 'Arbitrum', category: 'erc20' as const, nativeSymbol: 'ETH', nativeName: 'Ethereum', wrappedAddr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: '0xa', label: 'Optimism', category: 'erc20' as const, nativeSymbol: 'ETH', nativeName: 'Ethereum', wrappedAddr: '0x4200000000000000000000000000000000000006', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: '0x2105', label: 'Base', category: 'erc20' as const, nativeSymbol: 'ETH', nativeName: 'Ethereum', wrappedAddr: '0x4200000000000000000000000000000000000006', nativeLogo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: '0x38', label: 'BSC', category: 'bep20' as const, nativeSymbol: 'BNB', nativeName: 'BNB', wrappedAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', nativeLogo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: '0xa86a', label: 'Avalanche', category: 'erc20' as const, nativeSymbol: 'AVAX', nativeName: 'Avalanche', wrappedAddr: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', nativeLogo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
];

export interface TokenAsset {
  symbol: string;
  name: string;
  balance: string;
  token_address: string;
  decimals: number;
  usd_value: number;
  chain: string;
  chain_label: string;
  logo?: string;
}

export interface NativeCoin {
  symbol: string;
  name: string;
  chain: string;
  chain_label: string;
  balance: number;
  usd_value: number;
  logo?: string;
}

export interface AssetsResult {
  erc20: TokenAsset[];
  bep20: TokenAsset[];
  native: NativeCoin[];
}

const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2';

async function moralisFetch(url: string) {
  const apiKey = await getSetting('MORALIS_API_KEY');
  if (!apiKey || apiKey === 'YOUR_MORALIS_API_KEY') return null;
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey, accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchBatchPrices(tokenAddresses: string[], chainId: string): Promise<Record<string, number>> {
  if (!tokenAddresses.length) return {};

  const apiKey = await getSetting('MORALIS_API_KEY');
  if (!apiKey || apiKey === 'YOUR_MORALIS_API_KEY') return {};

  try {
    const res = await fetch(`${MORALIS_BASE}/erc20/prices?chain=${chainId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        tokens: tokenAddresses.map(addr => ({ token_address: addr })),
      }),
      next: { revalidate: 0 },
    });

    if (!res.ok) return {};
    const data = await res.json();

    const priceMap: Record<string, number> = {};
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.tokenAddress) {
          priceMap[item.tokenAddress.toLowerCase()] = Number(item.usdPrice) || 0;
        }
      }
    }
    return priceMap;
  } catch {
    return {};
  }
}

async function fetchAssets(address: string): Promise<AssetsResult> {
  const erc20: TokenAsset[] = [];
  const bep20: TokenAsset[] = [];
  const native: NativeCoin[] = [];

  await Promise.all(
    CHAINS.map(async (chain) => {

      const tokensRes = await moralisFetch(
        `${MORALIS_BASE}/${address}/erc20?chain=${chain.id}`
      );

      if (tokensRes && Array.isArray(tokensRes)) {
        const tokensWithBalance = tokensRes.filter((t: any) => {
          if (t.possible_spam === true) return false;
          const decimals = Number(t.decimals) || 18;
          return Number(t.balance) / Math.pow(10, decimals) > 0;
        });

        if (tokensWithBalance.length > 0) {
          const addresses = tokensWithBalance.map((t: any) => t.token_address);
          const priceMap = await fetchBatchPrices(addresses, chain.id);

          for (const t of tokensWithBalance) {
            const decimals = Number(t.decimals) || 18;
            const balance = Number(t.balance) / Math.pow(10, decimals);
            const usdPrice = priceMap[t.token_address?.toLowerCase()] || 0;

            const token: TokenAsset = {
              symbol: t.symbol || '?',
              name: t.name || '',
              balance: t.balance,
              token_address: t.token_address || '',   // ← این خط اضافه شد
              decimals,
              usd_value: balance * usdPrice,
              chain: chain.id,
              chain_label: chain.label,
              logo: t.logo || t.thumbnail || undefined,
            };

            if (chain.category === 'bep20') bep20.push(token);
            else erc20.push(token);
          }
        }
      }

      const nativeRes = await moralisFetch(
        `${MORALIS_BASE}/${address}/balance?chain=${chain.id}`
      );

      if (nativeRes?.balance) {
        const bal = Number(nativeRes.balance) / 1e18;
        if (bal <= 0) return;

        const priceRes = await moralisFetch(
          `${MORALIS_BASE}/erc20/${chain.wrappedAddr}/price?chain=${chain.id}`
        );
        const usdPrice = Number(priceRes?.usdPrice) || 0;

        native.push({
          symbol: chain.nativeSymbol,
          name: chain.nativeName,
          chain: chain.id,
          chain_label: chain.label,
          balance: bal,
          usd_value: bal * usdPrice,
          logo: chain.nativeLogo,
        });
      }
    })
  );

  return { erc20, bep20, native };
}

function calcTotalUsdt(assets: AssetsResult): number {
  const sum = (arr: { usd_value: number }[]) => arr.reduce((s, t) => s + t.usd_value, 0);
  return sum(assets.erc20) + sum(assets.bep20) + sum(assets.native);
}