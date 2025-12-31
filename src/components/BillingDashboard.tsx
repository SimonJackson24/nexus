'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Coins, Zap, TrendingUp, 
  Download, ExternalLink, Check, X, Loader2 
} from 'lucide-react';
import { formatPrice } from '@/lib/billing/types';

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits_amount: number;
  price_pence: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  monthly_credits: number;
  price_pence_monthly: number;
}

interface UserCredits {
  credits_balance: number;
  total_earned_credits: number;
  total_spent_credits: number;
}

interface UserSubscription {
  id: string;
  plan_id: string;
  plan?: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'past_due' | 'paused';
  credits_this_cycle: number;
  current_cycle_end: string;
}

export default function BillingDashboard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'plans' | 'history'>('overview');
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const [creditsRes, packagesRes, plansRes] = await Promise.all([
        fetch('/api/billing/credits'),
        fetch('/api/billing/packages'),
        fetch('/api/billing/plans'),
      ]);

      const [creditsData, packagesData, plansData] = await Promise.all([
        creditsRes.json(),
        packagesRes.json(),
        plansRes.json(),
      ]);

      if (creditsData.credits) setCredits(creditsData.credits);
      if (creditsData.transactions) setTransactions(creditsData.transactions);
      if (creditsData.subscription) setSubscription(creditsData.subscription);
      if (packagesData.packages) setPackages(packagesData.packages);
      if (plansData.plans) setPlans(plansData.plans);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const res = await fetch('/api/billing/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });

      const data = await res.json();
      if (data.checkout_url) {
        // In production, redirect to Revolut checkout
        window.open(data.checkout_url, '_blank');
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setPurchasing(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setPurchasing(planId);
    try {
      const res = await fetch('/api/billing/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await res.json();
      if (data.checkout_url) {
        window.open(data.checkout_url, '_blank');
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setPurchasing(null);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            Billing & Credits
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-nexus-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-nexus-border">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'packages', label: 'Buy Credits', icon: Coins },
            { id: 'plans', label: 'Subscriptions', icon: Zap },
            { id: 'history', label: 'History', icon: Download },
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
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Credit Balance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-nexus-muted">Available Credits</span>
                  </div>
                  <div className="text-3xl font-bold">{credits?.credits_balance || 0}</div>
                </div>
                
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-nexus-muted">Total Earned</span>
                  </div>
                  <div className="text-3xl font-bold">{credits?.total_earned_credits || 0}</div>
                </div>
                
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-nexus-muted">Total Spent</span>
                  </div>
                  <div className="text-3xl font-bold">{credits?.total_spent_credits || 0}</div>
                </div>
              </div>

              {/* Active Subscription */}
              {subscription && (
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <h3 className="font-semibold mb-4">Active Subscription</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-medium">{subscription.plan?.name || 'Plan'}</div>
                      <div className="text-sm text-nexus-muted">
                        {subscription.plan?.monthly_credits.toLocaleString()} credits/month
                      </div>
                      <div className="text-sm text-nexus-muted mt-1">
                        Resets: {new Date(subscription.current_cycle_end).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatPrice(subscription.plan?.price_pence_monthly || 0)}
                        <span className="text-sm font-normal text-nexus-muted">/month</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        subscription.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {subscription.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('packages')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Buy More Credits
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="flex-1 bg-nexus-card border border-nexus-border text-nexus-text py-3 rounded-lg font-medium hover:bg-nexus-hover transition-colors"
                >
                  View Plans
                </button>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-nexus-card border border-nexus-border rounded-xl p-6 hover:border-primary-500/50 transition-colors">
                  <div className="text-2xl mb-2">💰</div>
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <p className="text-sm text-nexus-muted mb-4">{pkg.description}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold">{pkg.credits_amount.toLocaleString()}</span>
                    <span className="text-sm text-nexus-muted">credits</span>
                  </div>
                  <div className="text-xl font-bold mb-4">
                    {formatPrice(pkg.price_pence)}
                  </div>
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing === pkg.id}
                    className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {purchasing === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Purchase'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`bg-nexus-card border rounded-xl p-6 ${
                    plan.price_pence_monthly > 0 && plan.price_pence_monthly < 3000 
                      ? 'border-primary-500/50' 
                      : 'border-nexus-border'
                  }`}
                >
                  {plan.price_pence_monthly > 0 && plan.price_pence_monthly < 3000 && (
                    <div className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full inline-block mb-2">
                      Popular
                    </div>
                  )}
                  <div className="text-2xl mb-2">⚡</div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-nexus-muted mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold">{plan.monthly_credits.toLocaleString()}</span>
                    <span className="text-sm text-nexus-muted">credits/month</span>
                  </div>
                  <div className="text-xl font-bold mb-4">
                    {plan.price_pence_monthly === 0 ? 'Free' : `${formatPrice(plan.price_pence_monthly)}/mo`}
                  </div>
                  {plan.price_pence_monthly === 0 ? (
                    <button
                      disabled
                      className="w-full bg-nexus-border text-nexus-muted py-2 rounded-lg font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={purchasing === plan.id}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {purchasing === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-nexus-muted">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Your credit transactions will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-4 bg-nexus-card border border-nexus-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.amount > 0 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.amount > 0 ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{tx.description || tx.type}</div>
                          <div className="text-sm text-nexus-muted">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${
                        tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
