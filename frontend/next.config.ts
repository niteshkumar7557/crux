// The /api/:path* rewrite is what makes the app same-origin: the browser only ever
// talks to this origin, so the auth cookie stays sameSite lax and the API needs no
// public route. NEXT_PUBLIC_API_URL is baked in at BUILD time — changing it needs a
// rebuild, not a restart.

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

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
