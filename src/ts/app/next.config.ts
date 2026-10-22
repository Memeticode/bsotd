import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Share the repository's .env with the Python pipeline instead of keeping a
// second copy of the database connection string.
const repositoryEnv = path.resolve(process.cwd(), "../../../.env");

if (existsSync(repositoryEnv)) {
  process.loadEnvFile(repositoryEnv);
}

const nextConfig: NextConfig = {};

export default nextConfig;
