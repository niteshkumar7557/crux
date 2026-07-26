import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  }
};

// No org/project/authToken here — source-map upload is skipped (a warning, not
// an error). The SDK itself stays inert without NEXT_PUBLIC_SENTRY_DSN.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
