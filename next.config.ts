import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 't.me' },
      { protocol: 'https', hostname: '*.t.me' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
}

export default nextConfig
