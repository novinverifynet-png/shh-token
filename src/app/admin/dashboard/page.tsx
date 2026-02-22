'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { WalletTable } from '@/components/admin/dashboard/WalletTable';

export default function DashboardPage() {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[#0f0f0f]">
        <AdminSidebar />
        <main className="flex-1 pt-20 md:pt-8 p-4 md:p-8 overflow-y-auto">
          <div className="mb-6 md:mb-8">
            <h1 className="text-white font-semibold text-xl md:text-2xl">Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Connected wallets overview</p>
          </div>
          <WalletTable />
        </main>
      </div>
    </AdminGuard>
  );
}
