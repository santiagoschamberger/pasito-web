/** @type {import('next').NextConfig} */
const nextConfig = {
  // Apex → www redirect, handled at the app level instead of a Vercel
  // domain-level redirect. A domain-level redirect 307s EVERY path, including
  // /.well-known/apple-app-site-association and /.well-known/assetlinks.json.
  // Apple and Google fetch those files without following redirects, so iOS
  // Universal Links / Android App Links never verified for the apex host —
  // and the app shares invite links as https://pasito.app/g/<token>.
  // The .well-known files must therefore be served with a 200 on the apex.
  async redirects() {
    return [
      {
        source: '/:path((?!\\.well-known(?:/|$)).*)',
        has: [{ type: 'host', value: 'pasito.app' }],
        destination: 'https://www.pasito.app/:path',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        // The file has no extension, so it would default to octet-stream.
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
  turbopack: {
    root: process.cwd(),
  },
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/.git/**',
        '**/.next/**',
        '**/node_modules/**',
        '**/.playwright-mcp/**',
        '**/conectar-android-*.png',
      ],
    }

    return config
  },
}

export default nextConfig
