/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/tallyfold.html" }] };
  },
};

export default nextConfig;
