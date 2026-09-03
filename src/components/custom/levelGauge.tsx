import { ReactNode } from 'react';
import { mapTrustScoreToTier } from '@/lib/userTier';
import type { Tier } from '@/components/custom/userBadge';

interface LevelGaugeProps {
  score: number;
  label?: string;
  /** Center label when score < 20 and no tier has been earned yet. Defaults to "Not yet earned". */
  notEarnedLabel?: string;
  size?: number;
}

const NEUTRAL_COLOR = '#e5e7eb';

const tierColors: Record<Tier, string> = {
  starter: '#C42020',
  trusted: '#A2CEF5',
  reliable: '#EEA0A6',
  elite: '#D79E0F',
};

/**
 * Score zones aligned with backend deriveTrustTier and lib/userTier.ts.
 *   0–19 : no badge (neutral gray)
 *   20–39: starter
 *   40–64: trusted
 *   65–84: reliable
 *   85–100: elite
 */
const ZONES: Array<{ tier: Tier | undefined; until: number; color: string }> = [
  { tier: undefined,  until: 20,  color: NEUTRAL_COLOR },
  { tier: 'starter',  until: 40,  color: tierColors.starter },
  { tier: 'trusted',  until: 65,  color: tierColors.trusted },
  { tier: 'reliable', until: 85,  color: tierColors.reliable },
  { tier: 'elite',    until: 100, color: tierColors.elite },
];

export function LevelGauge({
  score,
  label,
  notEarnedLabel = 'Not yet earned',
  size = 200,
}: LevelGaugeProps): ReactNode {
  const normalizedScore = Math.max(0, Math.min(score, 100));
  const currentTier = mapTrustScoreToTier(normalizedScore);
  const activeColor = currentTier ? tierColors[currentTier] : NEUTRAL_COLOR;

  // Geometry — adjusted stroke widths
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.32;
  const outerStroke = size * 0.12;
  const innerStroke = size * 0.03;

  const fullOuter = Math.PI * 2 * outerRadius;
  const fullInner = Math.PI * 2 * innerRadius;
  const visibleDegrees = 270;
  const gapDegrees = 90;
  const circumference = (visibleDegrees / 360) * fullOuter;
  const innerCircumference = (visibleDegrees / 360) * fullInner;

  const filled = normalizedScore / 100;
  const dash = filled * innerCircumference;

  const startAngle = -180 - (gapDegrees / 2);

  // Outer ring segments — one per zone. The 0–20 "no badge" zone renders as a
  // muted neutral stripe so users can see what they need to cross to earn the first badge.
  const outerSegments = ZONES.map((zone, idx, arr) => {
    const startFrac = idx === 0 ? 0 : arr[idx - 1].until / 100;
    const endFrac = zone.until / 100;
    const length = (endFrac - startFrac) * circumference;
    const offset = startFrac * circumference;
    const isNoBadgeZone = zone.tier === undefined;

    return (
      <circle
        key={zone.tier ?? 'no-badge'}
        cx={size / 2}
        cy={size / 2}
        r={outerRadius}
        fill="none"
        stroke={zone.color}
        strokeWidth={outerStroke}
        strokeDasharray={`${length} ${fullOuter}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        opacity={isNoBadgeZone ? 0.5 : 1}
        style={{
          transform: `rotate(${startAngle}deg)`,
          transformOrigin: 'center',
        }}
      />
    );
  });

  const centerLabel =
    label ??
    (currentTier
      ? `${currentTier.charAt(0).toUpperCase()}${currentTier.slice(1)} level`
      : notEarnedLabel);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {outerSegments}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={innerRadius}
            fill="none"
            stroke={activeColor}
            strokeWidth={innerStroke}
            strokeDasharray={`${dash} ${fullInner}`}
            strokeLinecap="round"
            className="transition-all duration-700"
            style={{
              transform: `rotate(${startAngle}deg)`,
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Score & label - positioned absolutely in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold" style={{ color: activeColor }}>
            {Math.round(normalizedScore)}
            <span className="text-2xl text-text-secondary">/100</span>
          </p>
          <p className="text-sm text-text-secondary mt-1">{centerLabel}</p>
        </div>
      </div>
    </div>
  );
}
