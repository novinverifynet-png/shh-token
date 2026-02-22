'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="SHH Logo"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span className="text-white font-semibold text-xl tracking-tight">SHH</span>
          <span className="text-xs text-white/40 bg-white/5 border border-[#1d1d1d] rounded-full px-2 py-0.5">
            Admin
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-[#1d1d1d] rounded-2xl p-8">
          <h1 className="text-white font-semibold text-xl mb-1">Sign In</h1>
          <p className="text-white/40 text-sm mb-6">Access the admin panel</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-sm mb-1.5 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="
                  w-full bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl
                  px-4 py-3 text-white text-sm placeholder-white/20
                  focus:outline-none focus:border-blue-500/60 focus:bg-[#1e1e1e]
                  transition-all duration-200
                "
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-1.5 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="
                  w-full bg-[#1a1a1a] border border-[#1d1d1d] rounded-xl
                  px-4 py-3 text-white text-sm placeholder-white/20
                  focus:outline-none focus:border-blue-500/60 focus:bg-[#1e1e1e]
                  transition-all duration-200
                "
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-blue-500 to-blue-600
                hover:from-blue-400 hover:to-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                shadow-[0_0_20px_rgba(59,130,246,0.2)]
                hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]
              "
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
