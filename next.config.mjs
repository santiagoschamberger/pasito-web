/** @type {import('next').NextConfig} */
const nextConfig = {
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
