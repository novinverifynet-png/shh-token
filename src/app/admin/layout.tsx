import { AdminProviders } from '@/components/admin/AdminProviders';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      {children}
    </AdminProviders>
  );
}
