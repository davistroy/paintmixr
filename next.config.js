/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential configurations only
  images: {
    domains: ['localhost'],
  },
  experimental: {
    optimizePackageImports: ['react-color', '@supabase/supabase-js'],
  },
}

module.exports = nextConfig