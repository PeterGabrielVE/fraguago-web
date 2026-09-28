const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_ASSETS_HOST = POSTHOG_HOST.replace('.i.posthog.com', '-assets.i.posthog.com');

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Proxy de PostHog: el navegador envía a /ingest y Next reenvía a PostHog.
	async rewrites() {
		return [
			{ source: '/ingest/static/:path*', destination: `${POSTHOG_ASSETS_HOST}/static/:path*` },
			{ source: '/ingest/array/:path*', destination: `${POSTHOG_ASSETS_HOST}/array/:path*` },
			{ source: '/ingest/:path*', destination: `${POSTHOG_HOST}/:path*` },
		];
	},
	// Requerido por la API de PostHog (usa rutas con barra final).
	skipTrailingSlashRedirect: true,
};

if (process.env.NODE_ENV === 'development') {
	nextConfig.distDir = '.next-dev';
}

// Solo en el build de Docker: en Windows, standalone + pnpm falla al crear symlinks
if (process.env.NEXT_STANDALONE === 'true') {
	nextConfig.output = 'standalone';
}

export default nextConfig;
