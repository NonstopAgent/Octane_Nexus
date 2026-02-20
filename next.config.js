const nextConfig = {};

const withSentry =
  process.env.SENTRY_DSN &&
  typeof require('@sentry/nextjs').withSentryConfig === 'function'
    ? require('@sentry/nextjs').withSentryConfig
    : (config) => config;

module.exports = withSentry(nextConfig, {
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
