# SHH Token - Part 1

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. WalletConnect Project ID
در فایل `src/lib/wagmi.ts` مقدار `YOUR_WALLETCONNECT_PROJECT_ID` را با Project ID خود جایگزین کنید.
برای دریافت Project ID رایگان به [cloud.walletconnect.com](https://cloud.walletconnect.com) مراجعه کنید.

### 3. Run dev server
```bash
npm run dev
```

---

## Project Structure

```
src/
├── app/
│   ├── globals.css       # Global styles + Montserrat font
│   ├── layout.tsx        # Root layout with Providers
│   └── page.tsx          # Main landing page
├── components/
│   ├── Providers.tsx     # WagmiProvider + RainbowKitProvider + QueryClientProvider
│   ├── Header.tsx        # Header with logo, SHH name, version, ConnectButton
│   └── BuyTokenButton.tsx # Center button with wallet connect / coming soon logic
└── lib/
    └── wagmi.ts          # Wagmi + RainbowKit config
```

## Features (Part 1)
- ✅ Header with SHH logo, name, version badge
- ✅ RainbowKit ConnectButton (dark theme)
- ✅ After connection: wallet info, balance, network shown by RainbowKit
- ✅ Buy Token button centered on page
- ✅ If wallet not connected: opens wallet modal
- ✅ If wallet connected: SweetAlert2 "Coming Soon" message
- ✅ Montserrat font
- ✅ #0f0f0f background
- ✅ No scroll / overflow hidden
