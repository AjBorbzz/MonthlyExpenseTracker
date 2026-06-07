import type { NextConfig } from "next";

// const nextConfig: NextConfig = {};
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'localhost:3000',
  ],
  devIndicators: false
}

export default nextConfig;
