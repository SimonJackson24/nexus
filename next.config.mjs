/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: 'standalone',
  // Expose environment variables to client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default nextConfig;
