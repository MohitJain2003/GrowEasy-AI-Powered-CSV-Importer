/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false, // Disable Google Fonts lookup timeouts during compilation
  // Allow proxy or direct requests to backend port 5000 if needed
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
