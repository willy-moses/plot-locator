import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',        // static export for Electron & Capacitor
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
