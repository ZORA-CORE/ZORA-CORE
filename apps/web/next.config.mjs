/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ["@zoracore/content", "@zoracore/i18n"]
  },
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default config;
