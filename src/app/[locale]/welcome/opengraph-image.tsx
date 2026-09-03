import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

export const alt = `${SITE_NAME} — Connecting diaspora communities worldwide`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Branded, generated social-share card for the public landing page.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #004c9c 0%, #00316a 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 2, opacity: 0.85 }}>
          {SITE_NAME.toUpperCase()}
        </div>
        {/* Satori requires an explicit `display` on any element with more than
            one child, and does not lay out <br /> — hence the nested flex column. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 24,
          }}
        >
          <div>Connecting diaspora</div>
          <div>communities worldwide</div>
        </div>
        <div style={{ fontSize: 30, marginTop: 32, opacity: 0.9 }}>
          Communities · Associations · Events · Opportunities · Marketplace
        </div>
      </div>
    ),
    { ...size },
  );
}
