'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-md">
      {/* Left: Logo + Name + Version */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 relative">
          <Image
            src="/logo.png"
            alt="SHH Logo"
            width={40}
            height={40}
            className="w-full h-full rounded-xl"
          />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">
          SHH
        </span>
        <span className="text-xs text-white/40 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 font-medium">
          1.0.0
        </span>
      </div>

      {/* Right: Connect Wallet */}
      <ConnectButton />
    </header>
  );
}
