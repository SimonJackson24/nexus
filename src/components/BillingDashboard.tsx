'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard, Coins, Zap, TrendingUp, Key, Plus, Trash2,
  Download, ExternalLink, Check, X, Loader2, Settings,
  Shield, ZapOff, Infinity, ChevronRight, AlertCircle
} from 'lucide-react';

interface ApiKey {
  id: string;
  provider: string;
  key_name: string | null;
  is_active: boolean;
  last_used_at: string | null;
  rate_limit_per_minute: number;
  is_valid: boolean;
  created_at: string;
}

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  monthly_credits: number;
  price_pence_monthly: number;
  max_chats: number;
  max_storage_gb: number;
  max_integrations: number;
  max_workflows: number;
  has_advanced_analytics: boolean;
  has_api_access: boolean;
}

interface UserSubscription {
  id: string;
  tier_id: string;
  tier?: SubscriptionTier;
  status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trial';
  subscription_mode: 'credits' | 'byok';
  credits_balance: number;
  credits_this_cycle: number;
  current_cycle_end: string | null;
}

interface UserCredits {
  credits_balance: number;
  total_earned_credits: number;
  total_spent_credits: number;
}

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  openai: { name: 'OpenAI', icon: '🟢', color: '#10a37f' },
  anthropic: { name: 'Anthropic', icon: '🟠', color: '#d97757' },
  google: { name: 'Google', icon: '🔵', color: '#4285f4' },
  deepseek: { name: 'DeepSeek', icon: '🟣', color: '#7c3aed' },
  openrouter: { name: 'OpenRouter', icon: '⚡', color: '#f59e0b' },
};

const formatPrice = (pricePence: number) => {
  const pounds = pricePence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pounds);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function BillingDashboard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tiers' | 'api-keys' | 'usage'>('overview');
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // API Key modal state
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState('openai');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [subRes, tiersRes, keysRes] = await Promise.all([
        fetch('/api/billing/subscription'),
        fetch('/api/billing/tiers'),
        fetch('/api/billing/api-keys'),
      ]);

      const [subData, tiersData, keysData] = await Promise.all([
        subRes.json(),
        tiersRes.json(),
        keysRes.json(),
      ]);

      if (subData.subscription) setSubscription(subData.subscription);
      if (tiersData.tiers) setTiers(tiersData.tiers);
      if (keysData.keys) setApiKeys(keysData.keys);

      // Also fetch credits
      const creditsRes = await fetch('/api/billing/credits');
      const creditsData = await creditsRes.json();
      if (creditsData.credits) setCredits(creditsData.credits);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newKeyValue.trim()) {
      setKeyError('Please enter your API key');
      return;
    }

    setProcessing('add-key');
    setKeyError(null);

    try {
      const res = await fetch('/api/billing/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKeyProvider,
          api_key: newKeyValue,
          key_name: newKeyName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setKeyError(data.error || 'Failed to add API key');
        return;
      }

      // Refresh keys and close modal
      setShowAddKeyModal(false);
      setNewKeyValue('');
      setNewKeyName('');
      fetchBillingData();
    } catch (error) {
      setKeyError('Network error. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    setProcessing(`delete-${keyId}`);
    try {
      const res = await fetch(`/api/billing/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchBillingData();
      }
    } catch (error) {
      console.error('Error deleting key:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleKey = async (keyId: string, isActive: boolean) => {
    setProcessing(`toggle-${keyId}`);
    try {
      await fetch('/api/billing/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId, is_active: !isActive }),
      });
      fetchBillingData();
    } catch (error) {
      console.error('Error toggling key:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleSwitchMode = async (mode: 'credits' | 'byok') => {
    setProcessing('switch-mode');
    try {
      await fetch('/api/billing/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_mode: mode }),
      });
      fetchBillingData();
    } catch (error) {
      console.error('Error switching mode:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleSubscribe = async (tierId: string) => {
    setProcessing(`subscribe-${tierId}`);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_id: tierId }),
      });

      const data = await res.json();
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
      }
      fetchBillingData();
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-nexus-card border border-nexus-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-nexus-text">Loading billing data...</p>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || tiers.find(t => t.id === 'free');
  const isByokMode = subscription?.subscription_mode === 'byok';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            Billing & Subscription
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-nexus-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-nexus-border">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'tiers', label: 'Plans', icon: Zap },
            { id: 'api-keys', label: 'API Keys', icon: Key },
            { id: 'usage', label: 'Usage', icon: Coins },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-nexus-muted hover:text-nexus-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Subscription Mode Banner */}
              <div className={`p-4 rounded-xl border ${
                isByokMode 
                  ? 'bg-blue-600/20 border-blue-500/30' 
                  : 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isByokMode ? (
                      <Key className="w-6 h-6 text-blue-400" />
                    ) : (
                      <Coins className="w-6 h-6 text-yellow-400" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {isByokMode ? 'Bring Your Own Key Mode' : 'Credit-Based Subscription'}
                      </div>
                      <div className="text-sm text-nexus-muted">
                        {isByokMode 
                          ? 'Using your own API keys - unlimited AI usage'
                          : `${subscription?.credits_balance?.toLocaleString() || 0} credits remaining`
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchMode(isByokMode ? 'credits' : 'byok')}
                    disabled={processing === 'switch-mode'}
                    className="px-4 py-2 bg-nexus-card border border-nexus-border rounded-lg text-sm hover:bg-nexus-hover transition-colors disabled:opacity-50"
                  >
                    {processing === 'switch-mode' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isByokMode ? (
                      'Switch to Credits'
                    ) : (
                      'Switch to BYOK'
                    )}
                  </button>
                </div>
              </div>

              {/* Current Plan */}
              {currentTier && (
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Current Plan: {currentTier.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-nexus-muted">Monthly Credits</div>
                      <div className="font-semibold">
                        {currentTier.monthly_credits === 0 ? 'Unlimited (BYOK)' : currentTier.monthly_credits.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-nexus-muted">Max Chats</div>
                      <div className="font-semibold">{currentTier.max_chats === -1 ? 'Unlimited' : currentTier.max_chats}</div>
                    </div>
                    <div>
                      <div className="text-nexus-muted">Storage</div>
                      <div className="font-semibold">{currentTier.max_storage_gb}GB</div>
                    </div>
                    <div>
                      <div className="text-nexus-muted">Integrations</div>
                      <div className="font-semibold">{currentTier.max_integrations === -1 ? 'Unlimited' : currentTier.max_integrations}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Balance (for credit mode) */}
              {!isByokMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-nexus-muted">Available Credits</span>
                    </div>
                    <div className="text-3xl font-bold">{subscription?.credits_balance || 0}</div>
                    {subscription?.current_cycle_end && (
                      <div className="text-xs text-nexus-muted mt-2">
                        Resets: {formatDate(subscription.current_cycle_end)}
                      </div>
                    )}
                  </div>

                  <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-nexus-muted">Used This Cycle</span>
                    </div>
                    <div className="text-3xl font-bold">{subscription?.credits_this_cycle || 0}</div>
                  </div>

                  <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-nexus-muted">API Keys</span>
                    </div>
                    <div className="text-3xl font-bold">{apiKeys.filter(k => k.is_valid).length}</div>
                  </div>
                </div>
              )}

              {/* BYOK Status */}
              {isByokMode && (
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-blue-500" />
                    Your API Keys
                  </h3>
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-8 text-nexus-muted">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No API keys configured</p>
                      <p className="text-sm mb-4">Add an API key to start using AI models</p>
                      <button
                        onClick={() => setActiveTab('api-keys')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Add API Key
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-center justify-between p-3 bg-nexus-hover rounded-lg">
                          <div className="flex items-center gap-3">
                            <span style={{ color: PROVIDER_INFO[key.provider]?.color }}>
                              {PROVIDER_INFO[key.provider]?.icon}
                            </span>
                            <div>
                              <div className="font-medium">{key.key_name || PROVIDER_INFO[key.provider]?.name}</div>
                              <div className="text-xs text-nexus-muted">
                                {key.is_valid ? (
                                  <span className="text-green-400">Active</span>
                                ) : (
                                  <span className="text-red-400">Invalid</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-nexus-muted">{key.rate_limit_per_minute} RPM</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-3">
                {!isByokMode && (
                  <button
                    onClick={() => setActiveTab('tiers')}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Upgrade Plan
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('api-keys')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    isByokMode
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                      : 'bg-nexus-card border border-nexus-border text-nexus-text hover:bg-nexus-hover'
                  }`}
                >
                  <Key className="w-4 h-4 inline mr-2" />
                  {isByokMode ? 'Manage API Keys' : 'Add BYOK'}
                </button>
              </div>
            </div>
          )}

          {/* Tiers Tab */}
          {activeTab === 'tiers' && (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex justify-center gap-4 mb-6">
                <button
                  onClick={() => handleSwitchMode('credits')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !isByokMode
                      ? 'bg-primary-600 text-white'
                      : 'bg-nexus-card border border-nexus-border text-nexus-text'
                  }`}
                >
                  Credit-Based
                </button>
                <button
                  onClick={() => handleSwitchMode('byok')}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isByokMode
                      ? 'bg-primary-600 text-white'
                      : 'bg-nexus-card border border-nexus-border text-nexus-text'
                  }`}
                >
                  BYOK Mode
                </button>
              </div>

              {/* Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tiers.map(tier => (
                  <div
                    key={tier.id}
                    className={`bg-nexus-card border rounded-xl p-6 ${
                      subscription?.tier_id === tier.id
                        ? 'border-primary-500 ring-2 ring-primary-500/20'
                        : 'border-nexus-border'
                    }`}
                  >
                    {subscription?.tier_id === tier.id && (
                      <div className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full inline-block mb-2">
                        Current Plan
                      </div>
                    )}

                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                    <p className="text-sm text-nexus-muted mb-4">{tier.description}</p>

                    <div className="text-2xl font-bold mb-4">
                      {tier.monthly_credits === 0 ? (
                        <span className="flex items-center gap-1">
                          <Infinity className="w-6 h-6" />
                          <span>Unlimited</span>
                        </span>
                      ) : (
                        `${tier.monthly_credits.toLocaleString()}/mo`
                      )}
                    </div>

                    <div className="space-y-2 text-sm mb-6">
                      <div className="flex justify-between">
                        <span className="text-nexus-muted">Price</span>
                        <span>{tier.price_pence_monthly === 0 ? 'Free' : formatPrice(tier.price_pence_monthly)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-muted">Max Chats</span>
                        <span>{tier.max_chats === -1 ? 'Unlimited' : tier.max_chats}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-muted">Storage</span>
                        <span>{tier.max_storage_gb}GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-muted">Integrations</span>
                        <span>{tier.max_integrations === -1 ? 'Unlimited' : tier.max_integrations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-nexus-muted">API Access</span>
                        <span>{tier.has_api_access ? '✓' : '✗'}</span>
                      </div>
                    </div>

                    {tier.id === subscription?.tier_id ? (
                      <button
                        disabled
                        className="w-full bg-nexus-border text-nexus-muted py-2 rounded-lg font-medium cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(tier.id)}
                        disabled={processing === `subscribe-${tier.id}`}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {processing === `subscribe-${tier.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          'Subscribe'
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* BYOK Info */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <Key className="w-6 h-6 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Bring Your Own Key</h4>
                    <p className="text-sm text-nexus-muted mb-3">
                      Use your own API keys from OpenAI, Anthropic, Google, DeepSeek, or OpenRouter.
                      You pay them directly, and get unlimited AI usage on our platform.
                    </p>
                    <ul className="text-sm text-nexus-muted space-y-1">
                      <li>• No credit limits</li>
                      <li>• Access to any model your key supports</li>
                      <li>• Pay your AI provider directly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Your API Keys</h3>
                  <p className="text-sm text-nexus-muted">Manage your provider API keys for BYOK mode</p>
                </div>
                <button
                  onClick={() => setShowAddKeyModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add API Key
                </button>
              </div>

              {apiKeys.length === 0 ? (
                <div className="text-center py-12 bg-nexus-card border border-nexus-border rounded-xl">
                  <Key className="w-12 h-12 mx-auto mb-4 text-nexus-muted opacity-50" />
                  <p className="text-nexus-text mb-2">No API keys configured</p>
                  <p className="text-sm text-nexus-muted mb-4">
                    Add an API key to use AI models without consuming platform credits
                  </p>
                  <button
                    onClick={() => setShowAddKeyModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Add Your First Key
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map(key => (
                    <div
                      key={key.id}
                      className={`p-4 bg-nexus-card border rounded-xl ${
                        key.is_valid ? 'border-nexus-border' : 'border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl" style={{ color: PROVIDER_INFO[key.provider]?.color }}>
                            {PROVIDER_INFO[key.provider]?.icon}
                          </span>
                          <div>
                            <div className="font-medium">
                              {key.key_name || PROVIDER_INFO[key.provider]?.name}
                            </div>
                            <div className="text-xs text-nexus-muted">
                              {key.key_name && (
                                <span className="mr-2">{PROVIDER_INFO[key.provider]?.name}</span>
                              )}
                              Added {formatDate(key.created_at)}
                              {key.last_used_at && ` • Last used ${formatDate(key.last_used_at)}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {key.is_valid ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                              Valid
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                              Invalid
                            </span>
                          )}

                          <button
                            onClick={() => handleToggleKey(key.id, key.is_active)}
                            disabled={processing === `toggle-${key.id}`}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                              key.is_active
                                ? 'bg-nexus-hover text-nexus-text hover:bg-red-500/20 hover:text-red-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {processing === `toggle-${key.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : key.is_active ? (
                              'Disable'
                            ) : (
                              'Enable'
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteApiKey(key.id)}
                            disabled={processing === `delete-${key.id}`}
                            className="p-2 text-nexus-muted hover:text-red-400 transition-colors"
                          >
                            {processing === `delete-${key.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Provider Info */}
              <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                <h4 className="font-semibold mb-4">Supported Providers</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                    <div key={key} className="text-center p-3 bg-nexus-hover rounded-lg">
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className="text-sm">{info.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Usage Statistics</h3>

              {isByokMode ? (
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-6 h-6 text-blue-400" />
                    <div>
                      <h4 className="font-semibold">BYOK Mode Active</h4>
                      <p className="text-sm text-nexus-muted">
                        Your usage is tracked but not deducted from credits
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-nexus-card rounded-lg">
                      <div className="text-2xl font-bold">{apiKeys.length}</div>
                      <div className="text-sm text-nexus-muted">API Keys</div>
                    </div>
                    <div className="text-center p-4 bg-nexus-card rounded-lg">
                      <div className="text-2xl font-bold">
                        {apiKeys.filter(k => k.is_valid && k.is_active).length}
                      </div>
                      <div className="text-sm text-nexus-muted">Active Keys</div>
                    </div>
                    <div className="text-center p-4 bg-nexus-card rounded-lg">
                      <div className="text-2xl font-bold">
                        {apiKeys.reduce((sum, k) => sum + k.rate_limit_per_minute, 0)}
                      </div>
                      <div className="text-sm text-nexus-muted">Total RPM</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-nexus-muted">Credits Remaining</span>
                    </div>
                    <div className="text-3xl font-bold">{subscription?.credits_balance || 0}</div>
                  </div>

                  <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-nexus-muted">Used This Period</span>
                    </div>
                    <div className="text-3xl font-bold">{subscription?.credits_this_cycle || 0}</div>
                    {subscription?.current_cycle_end && (
                      <div className="text-xs text-nexus-muted mt-2">
                        Resets: {formatDate(subscription.current_cycle_end)}
                      </div>
                    )}
                  </div>

                  <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-nexus-muted">Earned Total</span>
                    </div>
                    <div className="text-3xl font-bold">{credits?.total_earned_credits || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add API Key Modal */}
      {showAddKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-md p-6 animate-slide-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add API Key
              </h3>
              <button
                onClick={() => {
                  setShowAddKeyModal(false);
                  setKeyError(null);
                  setNewKeyValue('');
                  setNewKeyName('');
                }}
                className="p-2 hover:bg-nexus-hover rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {keyError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {keyError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  API Key
                  <span className="text-nexus-muted font-normal ml-2">(encrypted & stored securely)</span>
                </label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder={`sk-... for ${PROVIDER_INFO[newKeyProvider]?.name}`}
                  className="w-full px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Key Name (optional)
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Work Account, Personal Key"
                  className="w-full px-4 py-2 bg-nexus-hover border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-400 mt-0.5" />
                  <p className="text-nexus-muted">
                    Your API key is encrypted using AES-256 encryption and stored securely.
                    We never share your key with third parties.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddKeyModal(false);
                  setKeyError(null);
                  setNewKeyValue('');
                  setNewKeyName('');
                }}
                className="flex-1 px-4 py-2 bg-nexus-card border border-nexus-border rounded-lg hover:bg-nexus-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApiKey}
                disabled={processing === 'add-key'}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {processing === 'add-key' ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Add Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
