import { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/seo';

/**
 * PWA web app manifest (served at /manifest.webmanifest).
 *
 * NOTE: icons currently reference the scalable SVG favicon (valid for modern
 * browsers). For best install/Lighthouse support, add dedicated maskable PNGs
 * (192×192 and 512×512) to /public and list them here with `purpose: 'maskable'`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Connecting diaspora communities worldwide`,
    short_name: SITE_NAME,
    description:
      'DiaspoPlug brings diaspora communities, associations, events, opportunities, and a trusted marketplace together in one place.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#004c9c',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
