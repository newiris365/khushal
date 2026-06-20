/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 uses Turbopack by default — empty config silences webpack conflict warning
  turbopack: {},

  // Reduces unnecessary double-renders in dev mode
  reactStrictMode: true,

  // Optimize image handling
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async rewrites() {
    // NEXT_PUBLIC_API_URL may include /api/v1 suffix — strip it to get the bare host
    const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_HOST || 'http://localhost:4000';
    const backendHost = raw.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '') || 'http://localhost:4000';

    return [
      // Primary versioned API
      {
        source: '/api/v1/:path*',
        destination: `${backendHost}/api/v1/:path*`,
      },
      // Legacy / module-specific API routes used by frontend pages
      {
        source: '/api/canteen/:path*',
        destination: `${backendHost}/api/canteen/:path*`,
      },
      {
        source: '/api/obe/:path*',
        destination: `${backendHost}/api/obe/:path*`,
      },
      {
        source: '/api/naac/:path*',
        destination: `${backendHost}/api/naac/:path*`,
      },
      {
        source: '/api/gate/:path*',
        destination: `${backendHost}/api/gate/:path*`,
      },
      {
        source: '/api/library/:path*',
        destination: `${backendHost}/api/library/:path*`,
      },
      {
        source: '/api/parent/:path*',
        destination: `${backendHost}/api/parent/:path*`,
      },
      {
        source: '/api/admissions/:path*',
        destination: `${backendHost}/api/admissions/:path*`,
      },
      {
        source: '/api/placements/:path*',
        destination: `${backendHost}/api/placements/:path*`,
      },
      {
        source: '/api/hr/:path*',
        destination: `${backendHost}/api/hr/:path*`,
      },
      {
        source: '/api/gym/:path*',
        destination: `${backendHost}/api/gym/:path*`,
      },
      {
        source: '/api/fitzone/:path*',
        destination: `${backendHost}/api/fitzone/:path*`,
      },
      {
        source: '/api/grievances/:path*',
        destination: `${backendHost}/api/grievances/:path*`,
      },
    ];
  },
};

export default nextConfig;
