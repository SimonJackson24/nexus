'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, CreditCard, Activity, Settings, 
  Search, Shield, BarChart3, RefreshCw, X,
  DollarSign, Zap, ChevronDown, CheckCircle, AlertCircle
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  credits_balance: number;
  total_earned_credits: number;
  total_spent_credits: number;
  created_at: string;
  subscription?: {
    plan_name: string;
    status: string;
    credits_this_cycle: number;
  };
}

interface Transaction {
  id: string;
  user_id: string;
  email: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface PlatformStats {
  total_users: number;
  active_subscriptions: number;
  total_credits_purchased: number;
  total_credits_used: number;
  monthly_revenue: number;
}

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // In production, these would be real API calls
      // For now, generate demo data
      setStats({
        total_users: 127,
        active_subscriptions: 45,
        total_credits_purchased: 50000,
        total_credits_used: 35000,
        monthly_revenue: 1299.99,
      });

      setUsers([
        {
          id: '1',
          email: 'john@example.com',
          credits_balance: 2500,
          total_earned_credits: 3000,
          total_spent_credits: 500,
          created_at: '2025-12-01T10:00:00Z',
          subscription: { plan_name: 'Pro', status: 'active', credits_this_cycle: 1500 }
        },
        {
          id: '2',
          email: 'jane@example.com',
          credits_balance: 500,
          total_earned_credits: 1000,
          total_spent_credits: 500,
          created_at: '2025-12-15T14:30:00Z',
          subscription: { plan_name: 'Basic', status: 'active', credits_this_cycle: 300 }
        },
      ]);

      setTransactions([
        { id: 't1', user_id: '1', email: 'john@example.com', type: 'purchase', amount: 2000, description: 'Pro Pack', created_at: '2025-12-20T10:00:00Z' },
        { id: 't2', user_id: '2', email: 'jane@example.com', type: 'usage', amount: -50, description: 'GPT-4 Turbo', created_at: '2025-12-21T15:30:00Z' },
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(pence / 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nexus-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            Admin Dashboard
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-nexus-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-nexus-border">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: CreditCard },
            { id: 'settings', label: 'Settings', icon: Settings },
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
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-nexus-text">Loading admin data...</p>
            </div>
          ) : activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-nexus-muted">Total Users</span>
                  </div>
                  <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
                </div>
                
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-nexus-muted">Active Subscriptions</span>
                  </div>
                  <div className="text-3xl font-bold">{stats?.active_subscriptions || 0}</div>
                </div>
                
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-nexus-muted">Credits Purchased</span>
                  </div>
                  <div className="text-3xl font-bold">{(stats?.total_credits_purchased || 0).toLocaleString()}</div>
                </div>
                
                <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-nexus-muted">Monthly Revenue</span>
                  </div>
                  <div className="text-3xl font-bold">{formatCurrency((stats?.monthly_revenue || 0) * 100)}</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-nexus-dark rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.amount > 0 ? <CreditCard className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{tx.email}</div>
                          <div className="text-xs text-nexus-muted">{tx.description}</div>
                        </div>
                      </div>
                      <div className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-nexus-card border border-nexus-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Users Table */}
              <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-nexus-dark border-b border-nexus-border">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">User</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Credits</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Subscription</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Joined</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(user => (
                        <tr key={user.id} className="border-b border-nexus-border last:border-0 hover:bg-nexus-hover">
                          <td className="p-4">
                            <div className="font-medium">{user.email}</div>
                            <div className="text-xs text-nexus-muted">ID: {user.id}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{user.credits_balance.toLocaleString()}</div>
                            <div className="text-xs text-nexus-muted">Spent: {user.total_spent_credits.toLocaleString()}</div>
                          </td>
                          <td className="p-4">
                            {user.subscription ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{user.subscription.plan_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  user.subscription.status === 'active' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {user.subscription.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-nexus-muted text-sm">No subscription</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-nexus-muted">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="text-primary-400 hover:text-primary-300 text-sm"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="bg-nexus-card border border-nexus-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-nexus-dark border-b border-nexus-border">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">User</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Description</th>
                      <th className="text-left p-4 text-sm font-medium text-nexus-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-nexus-border last:border-0 hover:bg-nexus-hover">
                        <td className="p-4 font-medium">{tx.email}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                            tx.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                            tx.type === 'usage' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`p-4 font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </td>
                        <td className="p-4 text-sm text-nexus-muted">{tx.description}</td>
                        <td className="p-4 text-sm text-nexus-muted">{formatDate(tx.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Platform Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Allow New Registrations</div>
                      <div className="text-sm text-nexus-muted">Users can sign up for new accounts</div>
                    </div>
                    <button className="w-12 h-6 bg-primary-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email Verification Required</div>
                      <div className="text-sm text-nexus-muted">Users must verify email before using</div>
                    </div>
                    <button className="w-12 h-6 bg-nexus-border rounded-full relative">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">AI API Fallback</div>
                      <div className="text-sm text-nexus-muted">Use demo responses if API fails</div>
                    </div>
                    <button className="w-12 h-6 bg-primary-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-nexus-card border border-nexus-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Credit Rates</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between p-2 bg-nexus-dark rounded">
                    <span>GPT-4 Turbo</span>
                    <span className="font-medium">10 credits/1K tokens</span>
                  </div>
                  <div className="flex justify-between p-2 bg-nexus-dark rounded">
                    <span>GPT-3.5 Turbo</span>
                    <span className="font-medium">1 credit/1K tokens</span>
                  </div>
                  <div className="flex justify-between p-2 bg-nexus-dark rounded">
                    <span>Claude 3 Opus</span>
                    <span className="font-medium">15 credits/1K tokens</span>
                  </div>
                  <div className="flex justify-between p-2 bg-nexus-dark rounded">
                    <span>Claude 3 Sonnet</span>
                    <span className="font-medium">3 credits/1K tokens</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
