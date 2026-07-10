/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow proxy or direct requests to backend port 5000 if needed
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
