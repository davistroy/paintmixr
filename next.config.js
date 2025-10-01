/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential configurations
  images: {
    domains: ['localhost'],
  },

  // Skip type checking and linting during build (we'll do it separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig