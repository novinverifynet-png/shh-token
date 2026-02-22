'use client';

import { useEffect, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { WalletModal } from './WalletModal';

interface Wallet {
  id: number;
  address: string;
  balance_usdt: string;
  connected_at: string;
  updated_at: string;
  is_connected: number;
}

const Toast = Swal.mixin({
  toast: true,
  position: 'bottom-left',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#1a1b1f',
  color: '#ffffff',
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} - ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function ActionButtons({ wallet, onView, onUpdate, onDelete, updating }: {
  wallet: Wallet;
  onView: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  updating: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onView} className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-400/10 transition-all" title="View">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      <button onClick={onUpdate} disabled={updating} className="p-1.5 rounded-lg text-white/30 hover:text-amber-400 hover:bg-amber-400/10 transition-all disabled:opacity-40" title="Update Balance">
        {updating ? (
          <svg width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="animate-spin fill-none"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        ) : (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        )}
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}

export function WalletTable() {
  const [wallets, setWallets]               = useState<Wallet[]>([]);
  const [loading, setLoading]               = useState(true);
  const [updatingId, setUpdatingId]         = useState<number | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wallets');
      const json = await res.json();
      if (json.success) setWallets(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const handleDelete = async (wallet: Wallet) => {
    const result = await Swal.fire({
      title: 'Delete Wallet?',
      html: `<span style="color:#999;font-size:13px">${wallet.address}</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      background: '#1a1a1a',
      color: '#ffffff',
      customClass: { popup: 'rounded-2xl' },
    });
    if (!result.isConfirmed) return;
    const res = await fetch(`/api/wallets/${wallet.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setWallets(prev => prev.filter(w => w.id !== wallet.id));
      Toast.fire({ icon: 'success', title: 'Wallet deleted' });
    } else {
      Toast.fire({ icon: 'error', title: 'Failed to delete' });
    }
  };

  const handleUpdate = async (wallet: Wallet) => {
    setUpdatingId(wallet.id);
    try {
      const res  = await fetch(`/api/wallets/${wallet.id}`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) {
        setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance_usdt: json.balance_usdt, updated_at: new Date().toISOString() } : w));
        Toast.fire({ icon: 'success', title: 'Balance updated' });
      } else {
        Toast.fire({ icon: 'error', title: 'Update failed' });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Total Wallets',  value: wallets.length },
          { label: 'Connected',      value: wallets.filter(w => w.is_connected).length },
          { label: 'Disconnected',   value: wallets.filter(w => !w.is_connected).length },
        ].map(stat => (
          <div key={stat.label} className="bg-[#141414] border border-[#1d1d1d] rounded-2xl px-3 md:px-5 py-3 md:py-4">
            <p className="text-white/40 text-xs mb-1 truncate">{stat.label}</p>
            <p className="text-white font-semibold text-xl md:text-2xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="bg-[#141414] border border-[#1d1d1d] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 md:px-5 py-4 border-b border-[#1d1d1d]">
          <h2 className="text-white font-semibold text-sm flex-1">Wallets</h2>
          <button onClick={fetchWallets} className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Refresh">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">No wallets connected yet</div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1d1d1d]">
                    {['#', 'Address', 'Balance (USDT)', 'Connected At', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-white/30 font-medium px-5 py-3 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet, idx) => (
                    <tr key={wallet.id} className="border-b border-[#1d1d1d] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 text-white/40 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-white/80 font-mono text-xs bg-white/5 px-2 py-1 rounded-lg">
                          {shortAddress(wallet.address)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-white/70 font-medium">${Number(wallet.balance_usdt).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-white/40 text-xs">{formatDate(wallet.connected_at)}</td>
                      <td className="px-5 py-3.5">
                        {wallet.is_connected ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/30 bg-white/5 border border-[#1d1d1d] px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ActionButtons
                          wallet={wallet}
                          onView={() => setSelectedWallet(wallet)}
                          onUpdate={() => handleUpdate(wallet)}
                          onDelete={() => handleDelete(wallet)}
                          updating={updatingId === wallet.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="md:hidden divide-y divide-[#1d1d1d]">
              {wallets.map((wallet, idx) => (
                <div key={wallet.id} className="px-4 py-4 space-y-3">
                  {/* Row 1: index + address + status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-white/30 text-xs w-4">{idx + 1}</span>
                      <span className="text-white/80 font-mono text-xs bg-white/5 px-2 py-1 rounded-lg">
                        {shortAddress(wallet.address)}
                      </span>
                    </div>
                    {wallet.is_connected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-white/30 bg-white/5 border border-[#1d1d1d] px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />Disconnected
                      </span>
                    )}
                  </div>
                  {/* Row 2: balance + date */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">${Number(wallet.balance_usdt).toFixed(2)} USDT</span>
                    <span className="text-white/30 text-xs">{formatDate(wallet.connected_at)}</span>
                  </div>
                  {/* Row 3: actions */}
                  <div className="flex justify-end">
                    <ActionButtons
                      wallet={wallet}
                      onView={() => setSelectedWallet(wallet)}
                      onUpdate={() => handleUpdate(wallet)}
                      onDelete={() => handleDelete(wallet)}
                      updating={updatingId === wallet.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedWallet && (
        <WalletModal
          walletId={selectedWallet.id}
          address={selectedWallet.address}
          onClose={() => setSelectedWallet(null)}
        />
      )}
    </>
  );
}
