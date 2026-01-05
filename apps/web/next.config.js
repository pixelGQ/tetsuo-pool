/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@tetsuo-pool/database",
    "@tetsuo-pool/tetsuo-rpc",
    "@tetsuo-pool/shared",
  ],
};

module.exports = nextConfig;
