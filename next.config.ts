import type { NextConfig } from "next";
import { validateProductionEnvironment } from "./src/server/config/env";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

export default (phase: string) => {
  // Only validate runtime environment variables if we are actually starting the server,
  // not during the static build phase where secrets might not be present.
  if (phase !== PHASE_PRODUCTION_BUILD) {
    if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
      // Don't crash if it's just a local build, but do validate if running in prod
      try {
         validateProductionEnvironment();
      } catch (err) {
         console.warn("Environment validation failed, but continuing for Next.js setup:", err);
      }
    }
  }

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: "standalone",
  };

  return nextConfig;
};
