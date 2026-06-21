import type { NextConfig } from "next";
import { validateProductionEnvironment } from "./src/server/config/env";

if (process.env.VERCEL_ENV) {
  validateProductionEnvironment();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
