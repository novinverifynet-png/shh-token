'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { mainnet, polygon, optimism, arbitrum, base, bsc, avalanche } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'SHH Token',
  projectId: '8b720d480eca5e6f71319befda1e6897',
  chains: [mainnet, polygon, optimism, arbitrum, base, bsc, avalanche],
  ssr: true,
  wallets: [
    {
      groupName: 'Popular',
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
    {
      groupName: 'More',
      wallets: [trustWallet],
    },
  ],
});
