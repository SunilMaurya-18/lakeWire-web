/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
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
  async headers() {
    return [
      {
        source: "/home.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/animations/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
