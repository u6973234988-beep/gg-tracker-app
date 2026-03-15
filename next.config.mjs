/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  skipTrailingSlashRedirect: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('framer-motion');
    }
    return config;
  },
};

export default nextConfig;
