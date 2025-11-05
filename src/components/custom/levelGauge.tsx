import { ReactNode } from 'react';

type Tier = 'starter' | 'trusted' | 'reliable' | 'elite';

interface LevelGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

const tierColors: Record<Tier, string> = {
  starter: '#C42020',
  trusted: '#A2CEF5',
  reliable: '#EEA0A6',
  elite: '#D79E0F',
};

const tierLimits: Record<Tier, number> = {
  starter: 25,
  trusted: 50,
  reliable: 75,
  elite: 100,
};

export function LevelGauge({
  score,
  label,
  size = 200,
}: LevelGaugeProps): ReactNode {
  const currentTier = (Object.entries(tierLimits).find(
    ([, limit]) => score <= limit
  )?.[0] ?? 'elite') as Tier;

  // Geometry - adjusted stroke widths
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.32;
  const outerStroke = size * 0.12; // Increased from 0.08
  const innerStroke = size * 0.03; // Decreased from 0.08

  const fullOuter = Math.PI * 2 * outerRadius;
  const fullInner = Math.PI * 2 * innerRadius;
  const visibleDegrees = 270;
  const gapDegrees = 90;
  const circumference = (visibleDegrees / 360) * fullOuter;
  const innerCircumference = (visibleDegrees / 360) * fullInner;

  const filled = Math.min(score, 100) / 100;
  const dash = filled * innerCircumference;

  const startAngle = -180 - (gapDegrees / 2); 

  const outerSegments = Object.entries(tierLimits).map(
    ([tier, limit], idx, arr) => {
      const start = idx === 0 ? 0 : arr[idx - 1][1] / 100;
      const end = limit / 100;
      const length = (end - start) * circumference;
      const offset = start * circumference;

      return (
        <circle
          key={tier}
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          fill="none"
          stroke={tierColors[tier as Tier]}
          strokeWidth={outerStroke}
          strokeDasharray={`${length} ${fullOuter}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          style={{
            transform: `rotate(${startAngle}deg)`,
            transformOrigin: 'center',
          }}
        />
      );
    }
  );

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
            stroke={tierColors[currentTier]}
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
          <p className="text-5xl font-bold" style={{ color: tierColors[currentTier] }}>
            {Math.round(score)}
            <span className="text-2xl text-text-secondary">/100</span>
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {label ??
              `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} level`}
          </p>
        </div>
      </div>
    </div>
  );
}