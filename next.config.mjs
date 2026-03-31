/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // Reduce bundle size by transforming certain imports (e.g. react-icons).
    optimizePackageImports: ["react-icons"],
  },
};

export default nextConfig;
