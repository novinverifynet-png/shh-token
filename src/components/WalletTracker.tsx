'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

export function WalletTracker() {
  const { address, isConnected } = useAccount();
  const prevAddress = useRef<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      // New wallet connected
      if (prevAddress.current !== address) {
        fetch('/api/wallets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }).catch(console.error);
        prevAddress.current = address;
      }
    } else {
      // Wallet disconnected
      if (prevAddress.current) {
        fetch('/api/wallets/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: prevAddress.current }),
        }).catch(console.error);
        prevAddress.current = null;
      }
    }
  }, [isConnected, address]);

  return null;
}
