'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import Swal from 'sweetalert2';

interface Setting {
  id: number;
  key_name: string;
  key_value: string;
  description: string | null;
  updated_at: string;
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

const SENSITIVE_KEYS = ['ADMIN_PASSWORD', 'MORALIS_API_KEY', 'NEXTAUTH_SECRET'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        const map: Record<string, string> = {};
        json.data.forEach((s: Setting) => { map[s.key_name] = s.key_value; });
        setValues(map);
      } else {
        setError(json.error || 'Failed to load settings');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (key_name: string) => {
    setSaving(key_name);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name, key_value: values[key_name] }),
      });
      const json = await res.json();
      if (json.success) {
        Toast.fire({ icon: 'success', title: 'Setting saved' });
        fetchSettings();
      } else {
        Toast.fire({ icon: 'error', title: json.error || 'Failed to save' });
      }
    } finally {
      setSaving(null);
    }
  };

  const isSensitive = (key: string) => SENSITIVE_KEYS.includes(key);

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[#0f0f0f]">
        <AdminSidebar />
        <main className="flex-1 pt-20 md:pt-8 p-4 md:p-8 overflow-x-hidden overflow-y-auto min-w-0">
          <div className="mb-6 md:mb-8">
            <h1 className="text-white font-semibold text-xl md:text-2xl">Settings</h1>
            <p className="text-white/40 text-sm mt-1">Manage system configuration values</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="w-full max-w-2xl">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
                <div className="flex items-start gap-3">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-red-400 shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Database Error</p>
                    <p className="text-red-400/70 text-xs mt-1 font-mono break-all">{error}</p>
                    <p className="text-white/30 text-xs mt-3">
                      Make sure MySQL is running and <span className="font-mono text-white/50">.env.local</span> is configured correctly.
                    </p>
                    <button onClick={fetchSettings} className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl space-y-3">
              {settings.map(setting => (
                <div key={setting.key_name} className="bg-[#141414] border border-[#1d1d1d] rounded-2xl px-4 md:px-5 py-4">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-white/80 text-sm font-semibold font-mono break-all">{setting.key_name}</span>
                    {isSensitive(setting.key_name) && (
                      <span className="text-xs text-amber-400/70 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full shrink-0">
                        sensitive
                      </span>
                    )}
                  </div>

                  {setting.description && (
                    <p className="text-white/30 text-xs mb-3">{setting.description}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type={isSensitive(setting.key_name) && !revealed[setting.key_name] ? 'password' : 'text'}
                        value={values[setting.key_name] ?? ''}
                        onChange={e => setValues(prev => ({ ...prev, [setting.key_name]: e.target.value }))}
                        className="
                          w-full min-w-0 bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl
                          px-4 py-2.5 text-white/80 text-sm font-mono
                          focus:outline-none focus:border-blue-500/60
                          transition-all duration-200 pr-10 truncate
                        "
                      />
                      {isSensitive(setting.key_name) && (
                        <button
                          onClick={() => setRevealed(prev => ({ ...prev, [setting.key_name]: !prev[setting.key_name] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                        >
                          {revealed[setting.key_name] ? (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(setting.key_name)}
                      disabled={saving === setting.key_name || values[setting.key_name] === setting.key_value}
                      className="
                        px-3 md:px-4 py-2.5 rounded-xl text-sm font-semibold
                        bg-blue-500/15 text-blue-400 border border-blue-500/25
                        hover:bg-blue-500/25 disabled:opacity-30 disabled:cursor-not-allowed
                        transition-all duration-150 shrink-0
                      "
                    >
                      {saving === setting.key_name ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="animate-spin fill-none">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : 'Save'}
                    </button>
                  </div>

                  <p className="text-white/20 text-xs mt-2">
                    Updated: {new Date(setting.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}