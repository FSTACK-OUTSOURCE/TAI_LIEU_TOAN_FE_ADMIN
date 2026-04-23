/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig
