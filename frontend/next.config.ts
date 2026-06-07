import type { NextConfig } from "next";

// const nextConfig: NextConfig = {};
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    '192.168.254.112',
    '192.168.254.112:3000',
    'http://192.168.254.112:3000',
  ],
  devIndicators: false
}

export default nextConfig;
