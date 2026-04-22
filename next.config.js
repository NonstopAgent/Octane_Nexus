/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      // Dead public routes → correct authenticated dashboard routes
      {
        source: '/nexus',
        destination: '/dashboard/brief',
        permanent: false,
      },
      {
        source: '/trends',
        destination: '/dashboard/trends',
        permanent: false,
      },
      {
        source: '/lab',
        destination: '/dashboard/hook-lab',
        permanent: false,
      },
      {
        source: '/library',
        destination: '/dashboard/library',
        permanent: false,
      },
    ];
  },
};

function getWithSentryConfig() {
  try {
    return require('@sentry/nextjs').withSentryConfig;
  } catch {
    return null;
  }
}

const withSentryConfig = getWithSentryConfig();
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

module.exports =
  withSentryConfig && sentryDsn
    ? withSentryConfig(nextConfig, {
        silent: !process.env.CI,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        tunnelRoute: '/monitoring',
      })
    : nextConfig;
