import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";

const nextConfig: NextConfig = {
  // Força o root do workspace pra ESTE projeto (sem isso o Next sobe a árvore
  // procurando lockfile e acaba pegando C:\Users\vsousaesilva\package-lock.json,
  // causando ambiguidade de resolução de módulos no build SSR).
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    reactCompiler: false,
  },
  serverExternalPackages: ["bpmn-js", "bpmn-moddle"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
