/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/home.html" }],
      afterFiles: [
        { source: "/tallyfold.html", destination: "/home.html" },
        { source: "/lakewire-animations.html", destination: "/animations/write-path.html" },
        { source: "/lakewire-leases-lkw1-log.html", destination: "/animations/leases.html" },
      ],
    };
  },
};

export default nextConfig;
