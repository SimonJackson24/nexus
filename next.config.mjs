/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // External packages for Docker (optional but recommended)
  serverExternalPackages: ['@supabase/supabase-js'],
}

export default nextConfig
