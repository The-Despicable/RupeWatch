/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
    serverFunctions: true,
    incomingRequests: {
      ignore: [/\/api\/v1\/health/],
    },
    browserToTerminal: 'warn',
  },
};

module.exports = nextConfig;
