/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 390, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/wholesale/product/:slug',
        destination: '/product/:slug',
        permanent: true,
      },
      {
        source: '/wholesale/category/:slug/:subslug',
        destination: '/category/:slug/:subslug',
        permanent: true,
      },
      {
        source: '/wholesale/category/:slug',
        destination: '/category/:slug',
        permanent: true,
      },
      {
        source: '/wholesale',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/wholesale/:path*',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/admin/wholesale',
        destination: '/admin',
        permanent: true,
      },
      {
        source: '/admin/wholesale/:path*',
        destination: '/admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
