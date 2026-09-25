/** @type {import('next').NextConfig} */
const nextConfig = {
  // The fitting room lives bottom left; keep Next's dev button out of its way.
  devIndicators: { position: "bottom-right" },
  // The try-on route reads model and product images from /public on disk.
  // Static files are not traced into serverless functions by default, so
  // include them explicitly or Vercel deploys the route without them.
  outputFileTracingIncludes: {
    "/api/tryon": ["./public/models/**/*", "./public/products/**/*"],
  },
};

export default nextConfig;
