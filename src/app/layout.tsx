import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexus - Multi-Provider AI Chat Platform',
  description: 'Advanced AI chat platform with multi-provider support, agent profiles, and intelligent subtask management.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-nexus-darker text-nexus-text">
        {children}
      </body>
    </html>
  )
}
