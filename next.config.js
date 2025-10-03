/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential configurations
  images: {
    domains: ['localhost'],
  },

  // Enforce type checking and linting during build (strict mode)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig