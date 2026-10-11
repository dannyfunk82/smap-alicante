/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  deploymentId: "container-1-0-0",

  typescript: {
    ignoreBuildErrors: true,
  },

  productionBrowserSourceMaps: false,

  experimental: {
    serverSourceMaps: false,
  },
};

export default nextConfig;
