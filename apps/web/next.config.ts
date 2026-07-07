import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jobtrackr/core"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
