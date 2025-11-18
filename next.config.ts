import type { NextConfig } from "next";

if (!process.env.NEXT_FONT_IGNORE_ERRORS) {
  process.env.NEXT_FONT_IGNORE_ERRORS = "1";
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
