import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['lit', '@lit/reactive-element', 'lit-html', 'lit-element'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'amethyst-implicit-silkworm-944.mypinata.cloud',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
