'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      // Redirect to home on success
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nexus-darker flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
              <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
              <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Nexus</h1>
          <p className="text-nexus-muted mt-2">Installation Wizard</p>
        </div>

        {/* Form */}
        <div className="bg-nexus-card border border-nexus-border rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Configure Supabase
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-nexus-text mb-1">
                Supabase URL *
              </label>
              <input
                type="url"
                value={formData.supabaseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, supabaseUrl: e.target.value })
                }
                placeholder="https://your-project.supabase.co"
                required
                className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-text mb-1">
                Anon Public Key *
              </label>
              <input
                type="text"
                value={formData.supabaseAnonKey}
                onChange={(e) =>
                  setFormData({ ...formData, supabaseAnonKey: e.target.value })
                }
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                required
                className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white font-mono text-sm placeholder-nexus-muted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nexus-text mb-1">
                Service Role Key (optional)
              </label>
              <input
                type="text"
                value={formData.supabaseServiceKey}
                onChange={(e) =>
                  setFormData({ ...formData, supabaseServiceKey: e.target.value })
                }
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white font-mono text-sm placeholder-nexus-muted"
              />
              <p className="text-xs text-nexus-muted mt-1">
                Required for admin features only
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Complete Installation'}
            </button>
          </form>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-nexus-muted">
            Get these values from your Supabase project settings.{' '}
            <a
              href="https://supabase.com/dashboard/project/_/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300"
            >
              View API Settings →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
