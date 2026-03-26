import type { Tier } from "@/components/custom/userBadge";

const TIER_ORDER: Tier[] = ["starter", "trusted", "reliable", "elite"];

function normalizeTier(input?: string | null): Tier | undefined {
  if (!input) return undefined;
  const value = input.trim().toLowerCase();
  return TIER_ORDER.find((tier) => tier === value);
}

export function mapTrustScoreToTier(trustScore?: number | null): Tier | undefined {
  if (typeof trustScore !== "number" || Number.isNaN(trustScore)) return undefined;
  if (trustScore < 0) return "starter";
  if (trustScore <= 25) return "starter";
  if (trustScore <= 50) return "trusted";
  if (trustScore <= 75) return "reliable";
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
