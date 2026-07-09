import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Programmatically clean the .next development cache directory on startup
if (process.env.NODE_ENV === 'development') {
  const nextDir = join(__dirname, '.next');
  try {
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true });
      console.log('Successfully cleared Next.js development cache directory (.next).');
    }
  } catch (err) {
    console.warn('Could not clear Next.js dev cache:', err.message);
  }
}

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
