'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain, Sparkles, Shield, Zap, Code, BookOpen, Folder,
  MessageSquare, Users, Key, CreditCard, Check, ArrowRight,
  ChevronRight, Star, Infinity, Layers, Link2, Target,
  TrendingUp, Lock, Globe, Cpu, Bot, FileText, BarChart,
  Play, Menu, X as XIcon, ExternalLink, Terminal, Search
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Subscription tiers data
const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    description: 'Perfect for getting started with AI assistance',
    features: [
      { name: '100 AI credits / month', included: true },
      { name: 'Basic chat functionality', included: true },
      { name: '5 chats maximum', included: true },
      { name: '2 AI providers', included: true },
      { name: 'Community support', included: true },
      { name: 'Basic subtasks', included: true },
      { name: 'Security scanner', included: false },
      { name: 'Custom agents', included: false },
      { name: 'GitHub integration', included: false },
      { name: 'Priority support', included: false },
    ],
    gradient: 'from-gray-600 to-gray-700',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    priceLabel: '/month',
    description: 'For professionals who need more AI power',
    features: [
      { name: '2,500 AI credits / month', included: true },
      { name: 'Unlimited chat history', included: true },
      { name: 'Unlimited conversations', included: true },
      { name: 'All AI providers', included: true },
      { name: 'Advanced subtasks & linked context', included: true },
      { name: 'Custom agent creation', included: true },
      { name: 'Security scanner (basic)', included: true },
      { name: 'GitHub integration', included: true },
      { name: 'Email support', included: true },
      { name: '10GB storage', included: true },
    ],
    gradient: 'from-purple-600 to-blue-600',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    priceLabel: '/month',
    description: 'For teams and businesses with advanced needs',
    features: [
      { name: '10,000 AI credits / month', included: true },
      { name: 'Everything in Pro', included: true },
      { name: 'Advanced security scanner', included: true },
      { name: 'Unlimited custom agents', included: true },
      { name: 'API access', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'Priority processing', included: true },
      { name: 'Dedicated support', included: true },
      { name: '50GB storage', included: true },
      { name: 'Custom integrations', included: true },
    ],
    gradient: 'from-amber-500 to-orange-600',
    popular: false,
  },
];

// BYOK Mode benefits
const BYOK_BENEFITS = [
  {
    icon: Infinity,
    title: 'Unlimited AI Usage',
    description: 'Use your own API keys with no platform credit limits. Run as many conversations as you need.',
  },
  {
    icon: Key,
    title: 'Direct Provider Billing',
    description: 'Pay OpenAI, Anthropic, Google, or DeepSeek directly. Use your existing accounts and credits.',
  },
  {
    icon: Zap,
    title: 'Access to Latest Models',
    description: 'Get immediate access to new models as providers release them. No waiting for platform updates.',
  },
  {
    icon: Lock,
    title: 'Complete Control',
    description: 'Manage your own keys, rate limits, and usage. Full transparency over your AI spending.',
  },
];

// Specialized Agents
const AGENTS = [
  {
    icon: '🏗️',
    name: 'Architect',
    description: 'System design and architecture expert for building scalable applications',
    provider: 'GPT-4 Turbo',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '💻',
    name: 'Coder',
    description: 'Full-stack development specialist powered by MiniMax 2.1 with 1M token context',
    provider: 'MiniMax 2.1',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '✍️',
    name: 'Writer',
    description: 'Technical content and documentation specialist for clear, engaging content',
    provider: 'GPT-4 Turbo',
    gradient: 'from-purple-500 to-violet-500',
  },
  {
    icon: '📊',
    name: 'Analyst',
    description: 'Data analysis and insights expert powered by MiniMax 2.1',
    provider: 'MiniMax 2.1',
    gradient: 'from-amber-500 to-yellow-500',
  },
  {
    icon: '🛡️',
    name: 'Security Specialist',
    description: 'Comprehensive security auditing for OWASP Top 10 and advanced threats',
    provider: 'MiniMax 2.1',
    gradient: 'from-red-500 to-rose-500',
  },
  {
    icon: '🔍',
    name: 'Code Skeptic',
    description: 'Critical code review specialist for performance, bugs, and best practices',
    provider: 'MiniMax 2.1',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: '📚',
    name: 'Document Specialist',
    description: 'Documentation and knowledge management for APIs, READMEs, and guides',
    provider: 'GPT-4 Turbo',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: '🧠',
    name: 'Reasoner',
    description: 'Advanced reasoning for complex problem-solving and mathematical analysis',
    provider: 'MiniMax 2.1',
    gradient: 'from-orange-500 to-amber-500',
  },
];

// Features section data
const FEATURES = [
  {
    icon: Shield,
    title: 'Advanced Security Scanner',
    description: 'Comprehensive security analysis for your codebases. Detect vulnerabilities, security misconfigurations, and potential threats before they become issues. Covers OWASP Top 10, CWE classifications, and provides actionable fixes with CVSS scoring.',
    gradient: 'from-red-500 to-orange-500',
  },
  {
    icon: Layers,
    title: 'Smart Subtasks & Linked Context',
    description: 'Break down complex tasks into manageable subtasks with automatic context linking. AI-powered suggestions for task decomposition, priority management, and progress tracking. Linked context ensures all relevant information is preserved.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Folder,
    title: 'Organized Workspaces',
    description: 'Organize your AI conversations into Projects, Ideas, and Learning folders. Projects for active development work, Ideas for brainstorming sessions, and Learning for educational content and skill building.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Code,
    title: 'GitHub Integration',
    description: 'Seamless integration with GitHub repositories. Create branches, files, and issues directly from conversations. Review code, analyze PRs, and manage repositories without leaving the chat interface.',
    gradient: 'from-gray-600 to-gray-800',
  },
  {
    icon: MessageSquare,
    title: 'Multi-Provider AI',
    description: 'Access GPT-4 Turbo, Claude 3, MiniMax 2.1, and more from a single interface. Choose the best model for each task, compare responses, and optimize for cost or quality.',
    gradient: 'from-green-500 to-teal-500',
  },
  {
    icon: Target,
    title: 'BYOK + Token Hybrid',
    description: 'Flexible subscription model with credit-based plans and Bring Your Own Key (BYOK) option. Use platform credits for convenience or your own API keys for unlimited usage and direct billing.',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// Testimonials
const TESTIMONIALS = [
  {
    quote: "Nexus has transformed how our team handles code reviews. The Security Specialist agent caught vulnerabilities we would have missed entirely.",
    author: "Sarah Chen",
    role: "CTO at TechStart",
    avatar: "👩‍💼",
  },
  {
    quote: "The BYOK mode is a game-changer. We use our existing OpenAI credits without any platform overhead. Pure efficiency.",
    author: "Michael Ross",
    role: "Lead Developer at ScaleUp",
    avatar: "👨‍💻",
  },
  {
    quote: "Breaking complex tasks into subtasks with linked context has made our AI projects so much more manageable. Best organization tool I've used.",
    author: "Emma Wilson",
    role: "Product Manager at InnovateCo",
    avatar: "👩‍💼",
  },
];

// Schema.org structured data for SEO
const generateStructuredData = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Nexus',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web, macOS, Windows, Linux',
  offers: {
    '@type': 'Offer',
    price: '0.00',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  description: 'Advanced AI chat platform with multi-provider support, specialized agents, security scanning, and intelligent task management.',
  featureList: [
    'Multi-provider AI chat',
    'Specialized AI agents',
    'Security vulnerability scanner',
    'Smart subtask management',
    'GitHub integration',
    'BYOK and credit-based subscriptions',
    'Custom agent creation',
    'Unlimited chat history',
  ],
  author: {
    '@type': 'Organization',
    name: 'Nexus',
    url: 'https://nexus.example.com',
  },
});

export default function Homepage() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    // Create Supabase client on client side only
    const client = createClient();
    setSupabase(client);

    // Check auth state
    const checkAuth = async () => {
      const { data: { user } } = await client.auth.getUser();
      setUser(user);
    };
    checkAuth();

    // Scroll listener for navbar
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/app';
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-nexus-darker">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateStructuredData()) }}
      />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-nexus-darker/95 backdrop-blur-md border-b border-nexus-border' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl gradient-text">Nexus</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-nexus-muted hover:text-nexus-text transition-colors">Features</a>
              <a href="#agents" className="text-nexus-muted hover:text-nexus-text transition-colors">Agents</a>
              <a href="#pricing" className="text-nexus-muted hover:text-nexus-text transition-colors">Pricing</a>
              <a href="#byok" className="text-nexus-muted hover:text-nexus-text transition-colors">BYOK</a>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <a
                  href="/app"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <>
                  <button
                    onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                    className="text-nexus-muted hover:text-nexus-text transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Get Started</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-nexus-muted hover:text-nexus-text"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-nexus-card border-b border-nexus-border">
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-nexus-muted hover:text-nexus-text">Features</a>
              <a href="#agents" className="block text-nexus-muted hover:text-nexus-text">Agents</a>
              <a href="#pricing" className="block text-nexus-muted hover:text-nexus-text">Pricing</a>
              <a href="#byok" className="block text-nexus-muted hover:text-nexus-text">BYOK</a>
              <hr className="border-nexus-border" />
              {user ? (
                <a
                  href="/app"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse-slow delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-nexus-card/50 border border-nexus-border rounded-full mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-nexus-muted">Now with MiniMax 2.1 Integration</span>
            <ChevronRight className="w-4 h-4 text-nexus-muted" />
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="text-white">The Ultimate</span>
            <br />
            <span className="gradient-text">AI Development Platform</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-nexus-muted max-w-3xl mx-auto mb-10 animate-fade-in">
            Experience the most advanced AI chat platform built for developers. 
            Multi-provider support, specialized agents, security scanning, and intelligent 
            task management — all in one powerful workspace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in">
            <a
              href="/app"
              className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-all shadow-lg shadow-purple-600/25"
            >
              <Brain className="w-5 h-5" />
              <span>Start Chatting Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 bg-nexus-card border border-nexus-border rounded-xl font-semibold text-lg hover:bg-nexus-hover transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto animate-fade-in">
            {[
              { value: '8+', label: 'AI Providers' },
              { value: '1M', label: 'Token Context' },
              { value: '99.9%', label: 'Uptime' },
              { value: '50K+', label: 'Active Users' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-nexus-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-nexus-muted rotate-90" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-nexus-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Features</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">
              Everything You Need to Build Better Software
            </h2>
            <p className="text-xl text-nexus-muted max-w-2xl mx-auto">
              A comprehensive suite of tools designed to supercharge your development workflow
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 bg-nexus-card border border-nexus-border rounded-2xl hover:border-nexus-hover transition-all hover:shadow-xl hover:shadow-purple-600/10"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-nexus-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialized Agents Section */}
      <section id="agents" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Specialized Agents</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">
              AI Experts for Every Task
            </h2>
            <p className="text-xl text-nexus-muted max-w-2xl mx-auto">
              Choose from our library of specialized AI agents, each optimized for specific tasks
            </p>
          </div>

          {/* Agents Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {AGENTS.map((agent, i) => (
              <div
                key={i}
                className="group p-6 bg-nexus-card border border-nexus-border rounded-2xl hover:border-nexus-hover transition-all hover:shadow-xl hover:shadow-purple-600/10"
              >
                <div className="text-4xl mb-4">{agent.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{agent.name}</h3>
                <p className="text-sm text-nexus-muted mb-3">{agent.description}</p>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-nexus-muted" />
                  <span className="text-xs text-primary-400">{agent.provider}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <a
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-nexus-card border border-nexus-border rounded-xl hover:bg-nexus-hover transition-colors"
            >
              <Bot className="w-5 h-5 text-primary-500" />
              <span>Try All Agents Free</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Dashboard Features Section */}
      <section className="py-24 bg-nexus-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Dashboard Features</span>
              <h2 className="text-4xl font-bold text-white mt-2 mb-6">
                Organize Your AI Workflow Like Never Before
              </h2>
              
              {/* Ideas */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <span className="text-xl">💡</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Ideas</h3>
                </div>
                <p className="text-nexus-muted pl-13">
                  Capture and develop creative concepts. Use the AI to brainstorm, refine, and expand your ideas 
                  with structured thinking. Perfect for product features, startup concepts, or creative projects.
                </p>
              </div>

              {/* Education */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Education</h3>
                </div>
                <p className="text-nexus-muted pl-13">
                  Learn new technologies and skills with AI-powered tutorials. Get explanations tailored to your 
                  level, practice exercises, and instant feedback. Track your learning progress over time.
                </p>
              </div>

              {/* Projects */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Folder className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Projects</h3>
                </div>
                <p className="text-nexus-muted pl-13">
                  Manage complex development work with structured project folders. Link conversations, 
                  track progress across subtasks, and maintain context for long-running projects.
                </p>
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-nexus-card border border-nexus-border rounded-2xl p-6 shadow-2xl">
                {/* Mock Dashboard Preview */}
                <div className="flex gap-3 mb-4">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-nexus-dark rounded-lg px-4 py-1 text-xs text-nexus-muted flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    <span>nexus.app/dashboard</span>
                  </div>
                </div>
                
                {/* Mock Content */}
                <div className="space-y-3">
                  {/* Folder Item */}
                  <div className="flex items-center gap-3 p-3 bg-nexus-hover rounded-lg">
                    <Folder className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Projects</div>
                      <div className="text-xs text-nexus-muted">12 conversations</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-nexus-muted" />
                  </div>

                  {/* Folder Item */}
                  <div className="flex items-center gap-3 p-3 bg-nexus-hover rounded-lg">
                    <span className="text-xl">💡</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Ideas</div>
                      <div className="text-xs text-nexus-muted">8 brainstorming sessions</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-nexus-muted" />
                  </div>

                  {/* Folder Item */}
                  <div className="flex items-center gap-3 p-3 bg-nexus-hover rounded-lg">
                    <BookOpen className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Education</div>
                      <div className="text-xs text-nexus-muted">5 learning paths</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-nexus-muted" />
                  </div>
                </div>

                {/* Agent Pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {['🏗️ Architect', '💻 Coder', '🛡️ Security', '📚 Docs'].map((agent, i) => (
                    <span key={i} className="px-3 py-1 bg-nexus-card border border-nexus-border rounded-full text-xs text-nexus-text">
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BYOK Section */}
      <section id="byok" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Subscription Model</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">
              BYOK + Token Credits
            </h2>
            <p className="text-xl text-nexus-muted max-w-2xl mx-auto">
              The most flexible AI subscription model. Choose how you want to pay.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Credit-Based */}
            <div className="relative p-8 bg-nexus-card border border-nexus-border rounded-2xl">
              <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-medium text-white">
                Popular Choice
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Credit-Based</h3>
                  <p className="text-nexus-muted">Pay-as-you-go AI credits</p>
                </div>
              </div>
              <p className="text-nexus-muted mb-6">
                Purchase credits to use with any AI provider. No API keys required. 
                Simple, predictable pricing with no provider rate limits.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Credits never expire (unless tier expires)',
                  'Automatic provider selection',
                  'Usage analytics and tracking',
                  'Priority support included',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-nexus-text">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* BYOK */}
            <div className="relative p-8 bg-nexus-card border border-nexus-border rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Key className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Bring Your Own Key</h3>
                  <p className="text-nexus-muted">Use your own API keys</p>
                </div>
              </div>
              <p className="text-nexus-muted mb-6">
                Connect your own API keys from OpenAI, Anthropic, Google, DeepSeek, or OpenRouter. 
                Pay providers directly for unlimited usage.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited AI usage',
                  'Pay providers directly',
                  'Access to latest models immediately',
                  'Full control over keys and rate limits',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-nexus-text">
                    <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {BYOK_BENEFITS.map((benefit, i) => (
              <div key={i} className="text-center p-6">
                <div className="w-12 h-12 bg-nexus-card border border-nexus-border rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h4 className="font-semibold text-white mb-2">{benefit.title}</h4>
                <p className="text-sm text-nexus-muted">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-nexus-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Pricing</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-nexus-muted max-w-2xl mx-auto">
              Choose the plan that fits your needs. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative p-8 bg-nexus-card border rounded-2xl transition-all hover:shadow-xl hover:shadow-purple-600/10 ${
                  tier.popular 
                    ? 'border-primary-500 ring-2 ring-primary-500/20' 
                    : 'border-nexus-border'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}

                <div className={`w-14 h-14 bg-gradient-to-br ${tier.gradient} rounded-xl flex items-center justify-center mb-4`}>
                  {tier.id === 'free' && <Star className="w-7 h-7 text-white" />}
                  {tier.id === 'pro' && <Zap className="w-7 h-7 text-white" />}
                  {tier.id === 'enterprise' && <Crown className="w-7 h-7 text-white" />}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-nexus-muted mb-4">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">£{tier.price}</span>
                  <span className="text-nexus-muted">{tier.priceLabel}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XIcon className="w-4 h-4 text-nexus-muted flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-nexus-text' : 'text-nexus-muted'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={user ? '/app' : `/auth?mode=signup&tier=${tier.id}`}
                  className={`block w-full py-3 rounded-xl font-medium text-center transition-all ${
                    tier.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                      : 'bg-nexus-hover text-nexus-text hover:bg-nexus-border'
                  }`}
                >
                  {user ? 'Current Plan' : tier.price === 0 ? 'Get Started Free' : 'Subscribe Now'}
                </a>
              </div>
            ))}
          </div>

          {/* Enterprise CTA */}
          <div className="text-center mt-12">
            <p className="text-nexus-muted mb-4">Need a custom solution?</p>
            <a
              href="mailto:enterprise@nexus.example.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-nexus-card border border-nexus-border rounded-xl hover:bg-nexus-hover transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Contact Enterprise Sales</span>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary-500 uppercase tracking-wider">Testimonials</span>
            <h2 className="text-4xl font-bold text-white mt-2 mb-4">
              Loved by Developers Worldwide
            </h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="p-6 bg-nexus-card border border-nexus-border rounded-2xl">
                <div className="text-4xl mb-4">{testimonial.avatar}</div>
                <p className="text-nexus-text mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-nexus-muted">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-nexus-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Development Workflow?
          </h2>
          <p className="text-xl text-nexus-muted mb-8">
            Join thousands of developers using Nexus to build better software faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/app"
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              <Brain className="w-5 h-5" />
              <span>Start Chatting Free</span>
            </a>
            <a
              href="#pricing"
              className="flex items-center gap-2 px-8 py-4 bg-nexus-card border border-nexus-border rounded-xl font-semibold text-lg hover:bg-nexus-hover transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-nexus-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl gradient-text">Nexus</span>
              </div>
              <p className="text-sm text-nexus-muted">
                The ultimate AI development platform for modern developers.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-nexus-muted">
                <li><a href="#features" className="hover:text-nexus-text">Features</a></li>
                <li><a href="#pricing" className="hover:text-nexus-text">Pricing</a></li>
                <li><a href="#agents" className="hover:text-nexus-text">Agents</a></li>
                <li><a href="#byok" className="hover:text-nexus-text">BYOK</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-nexus-muted">
                <li><a href="#" className="hover:text-nexus-text">Documentation</a></li>
                <li><a href="#" className="hover:text-nexus-text">API Reference</a></li>
                <li><a href="#" className="hover:text-nexus-text">Blog</a></li>
                <li><a href="#" className="hover:text-nexus-text">Community</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-nexus-muted">
                <li><a href="#" className="hover:text-nexus-text">About</a></li>
                <li><a href="#" className="hover:text-nexus-text">Privacy</a></li>
                <li><a href="#" className="hover:text-nexus-text">Terms</a></li>
                <li><a href="#" className="hover:text-nexus-text">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-nexus-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-nexus-muted">
              © 2024 Nexus. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-nexus-muted hover:text-nexus-text">
                <Globe className="w-5 h-5" />
              </a>
              <a href="#" className="text-nexus-muted hover:text-nexus-text">
                <MessageSquare className="w-5 h-5" />
              </a>
              <a href="#" className="text-nexus-muted hover:text-nexus-text">
                <Code className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-nexus-card border border-nexus-border rounded-xl w-full max-w-md p-6 animate-slide-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-2 hover:bg-nexus-hover rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-nexus-dark border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-nexus-dark border border-nexus-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Please wait...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="w-full text-sm text-primary-400 hover:text-primary-300"
              >
                {authMode === 'signin'
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for X icon
function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Helper component for Crown icon
function Crown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
