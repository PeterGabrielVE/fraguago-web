/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === 'development') {
	nextConfig.distDir = '.next-dev';
}

export default nextConfig;
