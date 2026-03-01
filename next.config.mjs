/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "seeklogo.com" },
      { protocol: "https", hostname: "xstreamcp-assets-msp.streamready.in" },
    ],
  },
};

export default nextConfig;
