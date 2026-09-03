import type { Tier } from "@/components/custom/userBadge";

const TIER_ORDER: Tier[] = ["starter", "trusted", "reliable", "elite"];

function normalizeTier(input?: string | null): Tier | undefined {
  if (!input) return undefined;
  const value = input.trim().toLowerCase();
  return TIER_ORDER.find((tier) => tier === value);
}

export function mapTrustScoreToTier(trustScore?: number | null): Tier | undefined {
  if (typeof trustScore !== "number" || Number.isNaN(trustScore)) return undefined;
  // Scores under 20 show no badge — must be earned via real activity (≥ 1 successful transaction).
  if (trustScore < 20) return undefined;
  if (trustScore < 40) return "starter";
  if (trustScore < 65) return "trusted";
  if (trustScore < 85) return "reliable";
  return "elite";
}

export function resolveUserTier(params: {
  tier?: string | null;
  verificationTier?: string | null;
  trustScore?: number | null;
}): Tier | undefined {
  const tierFromRaw = normalizeTier(params.tier);
  if (tierFromRaw) return tierFromRaw;

  const tierFromVerification = normalizeTier(params.verificationTier);
  if (tierFromVerification) return tierFromVerification;

  return mapTrustScoreToTier(params.trustScore);
}
