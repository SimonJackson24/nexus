import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080808',
}

export const metadata: Metadata = {
  title: {
    default: 'Nexus - The Ultimate AI Development Platform | Multi-Provider Chat & Specialized Agents',
    template: '%s | Nexus',
  },
  description: 'Experience the most advanced AI chat platform built for developers. Multi-provider support (GPT-4, Claude 3, MiniMax 2.1), specialized AI agents, security vulnerability scanning, smart subtask management, and BYOK subscription model. Organize Ideas, Education, and Projects with unlimited context.',
  keywords: [
    'AI chat platform',
    'multi-provider AI',
    'GPT-4 chat',
    'Claude 3 AI',
    'MiniMax 2.1',
    'AI development tools',
    'specialized AI agents',
    'code security scanner',
    'AI code review',
    'BYOK AI subscription',
    'bring your own key',
    'AI taskdeveloper AI management',
    ' assistant',
    'unlimited context AI',
    'GitHub AI integration',
    'AI subtask management',
    'AI project management',
    'AI workspace',
    'AI productivity tools',
    'AI coding assistant',
  ].join(', '),
  authors: [{ name: 'Nexus' }],
  creator: 'Nexus',
  publisher: 'Nexus',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nexus.example.com',
    title: 'Nexus - The Ultimate AI Development Platform',
    description: 'Advanced AI chat platform with multi-provider support, specialized agents, security scanning, and intelligent task management.',
    siteName: 'Nexus',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nexus - AI Development Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus - The Ultimate AI Development Platform',
    description: 'Advanced AI chat platform with multi-provider support, specialized agents, security scanning, and intelligent task management.',
    images: ['/og-image.png'],
    creator: '@nexus',
  },
  alternates: {
    canonical: 'https://nexus.example.com',
  },
  category: 'technology',
  classification: 'AI, Development Tools, Software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.supabase.com" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#080808" />
      </head>
      <body className="antialiased bg-nexus-darker text-nexus-text">
        {children}
      </body>
    </html>
  )
}
