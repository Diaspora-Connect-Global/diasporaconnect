import type { MyParticipation, NetworkingStatus } from '@/services/gql/networking';
import type { NetworkingRefusalKind } from '@/lib/networkingRefusal';

/**
 * What a networking page should show, decided in one place from what the
 * gateway said. Order matters: the dark-launch refusal beats everything (the
 * person must read "not available yet", never "register first"), and a person
 * who has not joined is sent to the wizard rather than shown an empty hub.
 */
export type GateState =
  | 'loading'
  | 'unavailableYet'
  | 'error'
  | 'disabled'
  | 'notOpenYet'
  | 'closed'
  | 'notEligible'
  | 'needsSetup'
  | 'withdrawn'
  | 'revoked'
  | 'paused'
  | 'ready';

export function gateState(input: {
  loading: boolean;
  refusalKind?: NetworkingRefusalKind | null;
  status?: NetworkingStatus | null;
  mine?: MyParticipation | null;
}): GateState {
  const { loading, refusalKind, status, mine } = input;
  if (refusalKind === 'unavailableYet') return 'unavailableYet';
  if (loading && !status && !mine) return 'loading';
  if (status && status.featureAvailable === false) return 'unavailableYet';
  if (!status && !mine) return refusalKind ? 'error' : loading ? 'loading' : 'error';
  const enabled = status?.networkingEnabled ?? mine?.networkingEnabled ?? false;
  if (!enabled) return 'disabled';
  const eligibility = mine?.eligibility ?? status?.eligibility;
  if (eligibility && eligibility !== 'CONFIRMED') return 'notEligible';
  const standing = mine?.participation?.status ?? status?.participationStatus ?? 'NOT_JOINED';
  if (standing === 'REVOKED') return 'revoked';
  if (standing === 'WITHDRAWN') return 'withdrawn';
  if (standing === 'NOT_JOINED') {
    if (mine?.windowState === 'BEFORE_OPEN') return 'notOpenYet';
    if (mine?.windowState === 'CLOSED') return 'closed';
    return 'needsSetup';
  }
  if (mine?.windowState === 'CLOSED') return 'closed';
  return standing === 'PAUSED' ? 'paused' : 'ready';
}
