import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 避免上層目錄有 package-lock.json 時 chunk 路徑錯亂
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
