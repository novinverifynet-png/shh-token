// src/lib/rpc.ts
// همیشه از این helper استفاده کن به جای new ethers.JsonRpcProvider مستقیم
// staticNetwork جلوگیری میکنه از retry loop که هر ثانیه تکرار میشه
import { ethers } from 'ethers';

const CHAIN_CONFIG: Record<string, { rpc: string; chainId: number; name: string }> = {
    '1': { rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com', chainId: 1, name: 'mainnet' },
    '137': { rpc: process.env.POLY_RPC_URL || 'https://polygon.llamarpc.com', chainId: 137, name: 'matic' },
    '8453': { rpc: process.env.BASE_RPC_URL || 'https://base.llamarpc.com', chainId: 8453, name: 'base' },
    '56': { rpc: process.env.BSC_RPC_URL || 'https://bsc.llamarpc.com', chainId: 56, name: 'bnb' },
    '11155111': { rpc: process.env.SEP_RPC_URL || 'https://rpc.sepolia.org', chainId: 11155111, name: 'sepolia' },
};

export function getProvider(chainId: string | number): ethers.JsonRpcProvider {
    const config = CHAIN_CONFIG[chainId.toString()];
    if (!config) throw new Error(`Chain ${chainId} not supported`);

    const network = new ethers.Network(config.name, config.chainId);
    return new ethers.JsonRpcProvider(config.rpc, network, { staticNetwork: network });
}

export function getChainConfig(chainId: string | number) {
    const config = CHAIN_CONFIG[chainId.toString()];
    if (!config) throw new Error(`Chain ${chainId} not supported`);
    return config;
}