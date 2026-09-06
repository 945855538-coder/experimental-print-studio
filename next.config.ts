import type { NextConfig } from "next";

const repositoryPath = "/experimental-print-studio";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.GITHUB_ACTIONS ? repositoryPath : "",
};

export default nextConfig;
