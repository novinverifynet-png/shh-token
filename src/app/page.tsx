import { Header } from '@/components/Header';
import BuyTokenButton from '@/components/BuyTokenButton';
import { WalletTracker } from '@/components/WalletTracker';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0f0f0f] flex flex-col">
      <Header />
      <WalletTracker />
      <div className="flex-1 flex items-center justify-center">
        <BuyTokenButton />
      </div>
    </main>
  );
}
