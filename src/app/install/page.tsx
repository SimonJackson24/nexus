'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InstallPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Database
    databaseHost: '',
    databasePort: '5432',
    databaseName: 'nexus',
    databaseUser: '',
    databasePassword: '',
    
    // Admin Account
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminDisplayName: 'Admin',
    
    // AI Keys (optional)
    openaiKey: '',
    anthropicKey: '',
    minimaxKey: '',
    
    // Nexus Secret
    nexusSecret: '',
    
    // Redis
    redisHost: 'localhost',
    redisPort: '6379',
    redisPassword: '',
    redisKeyPrefix: 'nexus:',
    
    // GitHub OAuth
    githubClientId: '',
    githubClientSecret: '',
    githubRedirectUri: 'http://localhost:3000/api/github/callback',
    
    // Email Provider
    emailProvider: 'smtp',
    emailHost: '',
    emailPort: '587',
    emailUser: '',
    emailPassword: '',
    emailFromName: 'Nexus AI',
    emailFromEmail: 'noreply@nexus.local',
    
    // Site Branding
    siteName: 'Nexus AI',
    siteDescription: 'AI-Powered Development Platform',
    siteLogo: '/favicon.ico',
    primaryColor: '#8b5cf6',
    secondaryColor: '#3b82f6',
    accentColor: '#06b6d4',
    footerText: 'Powered by Nexus AI',
    
    // Features
    allowRegistration: 'true',
    enableBilling: 'true',
    enableGithubIntegration: 'true',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Test database connection first
      const testRes = await fetch('/api/install/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.databaseHost,
          port: parseInt(formData.databasePort),
          database: formData.databaseName,
          user: formData.databaseUser,
          password: formData.databasePassword,
        }),
      });

      if (!testRes.ok) {
        throw new Error('Database connection failed');
      }

      // Initialize database
      const initRes = await fetch('/api/install/init-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.databaseHost,
          port: parseInt(formData.databasePort),
          database: formData.databaseName,
          user: formData.databaseUser,
          password: formData.databasePassword,
        }),
      });

      if (!initRes.ok) {
        const data = await initRes.json();
        throw new Error(data.error || 'Database initialization failed');
      }

      // Create admin user
      const adminRes = await fetch('/api/install/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.adminEmail,
          password: formData.adminPassword,
          displayName: formData.adminDisplayName,
        }),
      });

      if (!adminRes.ok) {
        const data = await adminRes.json();
        throw new Error(data.error || 'Admin user creation failed');
      }

      // Save complete config
      const configRes = await fetch('/api/install/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: {
            host: formData.databaseHost,
            port: formData.databasePort,
            name: formData.databaseName,
            user: formData.databaseUser,
            password: formData.databasePassword,
          },
          ai: {
            openaiKey: formData.openaiKey,
            anthropicKey: formData.anthropicKey,
            minimaxKey: formData.minimaxKey,
          },
          redis: {
            host: formData.redisHost,
            port: formData.redisPort,
            password: formData.redisPassword,
            keyPrefix: formData.redisKeyPrefix,
          },
          github: {
            clientId: formData.githubClientId,
            clientSecret: formData.githubClientSecret,
            redirectUri: formData.githubRedirectUri,
          },
          email: {
            provider: formData.emailProvider,
            host: formData.emailHost,
            port: formData.emailPort,
            user: formData.emailUser,
            password: formData.emailPassword,
            fromName: formData.emailFromName,
            fromEmail: formData.emailFromEmail,
          },
          branding: {
            siteName: formData.siteName,
            siteDescription: formData.siteDescription,
            siteLogo: formData.siteLogo,
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
            accentColor: formData.accentColor,
            footerText: formData.footerText,
          },
          features: {
            allowRegistration: formData.allowRegistration === 'true',
            enableBilling: formData.enableBilling === 'true',
            enableGithubIntegration: formData.enableGithubIntegration === 'true',
          },
          nexusSecret: formData.nexusSecret,
        }),
      });

      if (!configRes.ok) {
        throw new Error('Failed to save configuration');
      }

      // Redirect to home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen bg-nexus-darker flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
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

        {/* Steps indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s
                    ? 'bg-purple-600 text-white'
                    : 'bg-nexus-card text-nexus-muted'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-nexus-card border border-nexus-border rounded-2xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Database Configuration */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  1. Database Configuration
                </h2>
                <p className="text-sm text-nexus-muted">Connect to your PostgreSQL database</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      PostgreSQL Host *
                    </label>
                    <input
                      type="text"
                      value={formData.databaseHost}
                      onChange={(e) => updateFormData('databaseHost', e.target.value)}
                      placeholder="localhost or VM IP"
                      required
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Port *
                    </label>
                    <input
                      type="text"
                      value={formData.databasePort}
                      onChange={(e) => updateFormData('databasePort', e.target.value)}
                      placeholder="5432"
                      required
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-nexus-text mb-1">
                    Database Name *
                  </label>
                  <input
                    type="text"
                    value={formData.databaseName}
                    onChange={(e) => updateFormData('databaseName', e.target.value)}
                    placeholder="nexus"
                    required
                    className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Database User *
                    </label>
                    <input
                      type="text"
                      value={formData.databaseUser}
                      onChange={(e) => updateFormData('databaseUser', e.target.value)}
                      placeholder="postgres"
                      required
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Database Password *
                    </label>
                    <input
                      type="password"
                      value={formData.databasePassword}
                      onChange={(e) => updateFormData('databasePassword', e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  Next: Admin Account
                </button>
              </div>
            )}

            {/* Step 2: Admin Account */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  2. Admin Account
                </h2>
                <p className="text-sm text-nexus-muted">Create your administrator account</p>
                
                <div>
                  <label className="block text-sm font-medium text-nexus-text mb-1">
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => updateFormData('adminEmail', e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-nexus-text mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.adminDisplayName}
                    onChange={(e) => updateFormData('adminDisplayName', e.target.value)}
                    placeholder="Admin"
                    className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => updateFormData('adminPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.adminConfirmPassword}
                      onChange={(e) => updateFormData('adminConfirmPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                </div>

                {formData.adminPassword !== formData.adminConfirmPassword && formData.adminConfirmPassword && (
                  <p className="text-red-400 text-sm">Passwords do not match</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-nexus-dark text-white rounded-xl font-medium hover:bg-nexus-border transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!formData.adminEmail || !formData.adminPassword || formData.adminPassword !== formData.adminConfirmPassword}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Next: AI & Redis
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: AI & Redis */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  3. AI Providers & Redis Cache
                </h2>
                <p className="text-sm text-nexus-muted">Configure AI providers and Redis for caching</p>
                
                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">AI Providers (Optional)</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={formData.openaiKey}
                      onChange={(e) => updateFormData('openaiKey', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      value={formData.anthropicKey}
                      onChange={(e) => updateFormData('anthropicKey', e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      MiniMax API Key
                    </label>
                    <input
                      type="password"
                      value={formData.minimaxKey}
                      onChange={(e) => updateFormData('minimaxKey', e.target.value)}
                      placeholder="..."
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">Redis Cache (Optional)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        Redis Host
                      </label>
                      <input
                        type="text"
                        value={formData.redisHost}
                        onChange={(e) => updateFormData('redisHost', e.target.value)}
                        placeholder="localhost"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        Redis Port
                      </label>
                      <input
                        type="text"
                        value={formData.redisPort}
                        onChange={(e) => updateFormData('redisPort', e.target.value)}
                        placeholder="6379"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Redis Password
                    </label>
                    <input
                      type="password"
                      value={formData.redisPassword}
                      onChange={(e) => updateFormData('redisPassword', e.target.value)}
                      placeholder="Leave empty if no password"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 bg-nexus-dark text-white rounded-xl font-medium hover:bg-nexus-border transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Next: GitHub & Email
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: GitHub & Email */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  4. GitHub OAuth & Email
                </h2>
                <p className="text-sm text-nexus-muted">Configure integrations and email provider</p>
                
                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">GitHub OAuth (Optional)</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      GitHub Client ID
                    </label>
                    <input
                      type="text"
                      value={formData.githubClientId}
                      onChange={(e) => updateFormData('githubClientId', e.target.value)}
                      placeholder="Iv23..."
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      GitHub Client Secret
                    </label>
                    <input
                      type="password"
                      value={formData.githubClientSecret}
                      onChange={(e) => updateFormData('githubClientSecret', e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Redirect URI
                    </label>
                    <input
                      type="text"
                      value={formData.githubRedirectUri}
                      onChange={(e) => updateFormData('githubRedirectUri', e.target.value)}
                      placeholder="http://localhost:3000/api/github/callback"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                    <p className="text-xs text-nexus-muted mt-1">Add this to your GitHub OAuth App settings</p>
                  </div>
                </div>

                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">Email Provider (Optional)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        SMTP Host
                      </label>
                      <input
                        type="text"
                        value={formData.emailHost}
                        onChange={(e) => updateFormData('emailHost', e.target.value)}
                        placeholder="smtp.example.com"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        SMTP Port
                      </label>
                      <input
                        type="text"
                        value={formData.emailPort}
                        onChange={(e) => updateFormData('emailPort', e.target.value)}
                        placeholder="587"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        SMTP Username
                      </label>
                      <input
                        type="text"
                        value={formData.emailUser}
                        onChange={(e) => updateFormData('emailUser', e.target.value)}
                        placeholder="noreply@example.com"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        SMTP Password
                      </label>
                      <input
                        type="password"
                        value={formData.emailPassword}
                        onChange={(e) => updateFormData('emailPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        From Name
                      </label>
                      <input
                        type="text"
                        value={formData.emailFromName}
                        onChange={(e) => updateFormData('emailFromName', e.target.value)}
                        placeholder="Nexus AI"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        From Email
                      </label>
                      <input
                        type="email"
                        value={formData.emailFromEmail}
                        onChange={(e) => updateFormData('emailFromEmail', e.target.value)}
                        placeholder="noreply@nexus.local"
                        className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-nexus-dark text-white rounded-xl font-medium hover:bg-nexus-border transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Next: Branding & Secret
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Branding & Secret */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  5. Branding & Security
                </h2>
                <p className="text-sm text-nexus-muted">Customize your site and set security keys</p>
                
                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">Site Branding</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={formData.siteName}
                      onChange={(e) => updateFormData('siteName', e.target.value)}
                      placeholder="Nexus AI"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Site Description
                    </label>
                    <input
                      type="text"
                      value={formData.siteDescription}
                      onChange={(e) => updateFormData('siteDescription', e.target.value)}
                      placeholder="AI-Powered Development Platform"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        Primary Color
                      </label>
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => updateFormData('primaryColor', e.target.value)}
                        className="w-full h-12 bg-nexus-dark border border-nexus-border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        Secondary Color
                      </label>
                      <input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                        className="w-full h-12 bg-nexus-dark border border-nexus-border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">
                        Accent Color
                      </label>
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => updateFormData('accentColor', e.target.value)}
                        className="w-full h-12 bg-nexus-dark border border-nexus-border rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={formData.footerText}
                      onChange={(e) => updateFormData('footerText', e.target.value)}
                      placeholder="Powered by Nexus AI"
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted"
                    />
                  </div>
                </div>

                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">Feature Settings</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.allowRegistration === 'true'}
                        onChange={(e) => updateFormData('allowRegistration', e.target.checked ? 'true' : 'false')}
                        className="w-5 h-5 rounded border-nexus-border bg-nexus-dark text-purple-600"
                      />
                      <span className="text-white">Allow new user registration</span>
                    </label>
                    
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.enableBilling === 'true'}
                        onChange={(e) => updateFormData('enableBilling', e.target.checked ? 'true' : 'false')}
                        className="w-5 h-5 rounded border-nexus-border bg-nexus-dark text-purple-600"
                      />
                      <span className="text-white">Enable billing system</span>
                    </label>
                    
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.enableGithubIntegration === 'true'}
                        onChange={(e) => updateFormData('enableGithubIntegration', e.target.checked ? 'true' : 'false')}
                        className="w-5 h-5 rounded border-nexus-border bg-nexus-dark text-purple-600"
                      />
                      <span className="text-white">Enable GitHub integration</span>
                    </label>
                  </div>
                </div>

                <div className="border border-nexus-border rounded-xl p-4 space-y-4">
                  <h3 className="font-medium text-purple-400">Security</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">
                      Nexus Secret Key *
                      <span className="text-nexus-muted ml-2 font-normal">Generate with: openssl rand -base64 32</span>
                    </label>
                    <input
                      type="password"
                      value={formData.nexusSecret}
                      onChange={(e) => updateFormData('nexusSecret', e.target.value)}
                      placeholder="Your 32+ character secret key"
                      required
                      minLength={32}
                      className="w-full px-4 py-3 bg-nexus-dark border border-nexus-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-white placeholder-nexus-muted font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 bg-nexus-dark text-white rounded-xl font-medium hover:bg-nexus-border transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.nexusSecret || formData.nexusSecret.length < 32}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Complete Installation'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-nexus-muted">
            Need help?{' '}
            <a
              href="https://github.com/your-repo/nexus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300"
            >
              View Documentation →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
