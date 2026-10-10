import type { OrganiserEntity } from '@/services/gql/eventsM2';

/**
 * The viewer's relationship to the community / association that organises an
 * event, from the entity's own `membershipStatus`. Drives the Join Organiser
 * Community CTA (rail + Register tab) so both always agree.
 */
export type OrganiserStanding = 'member' | 'pending' | 'suspended' | 'none';

export interface OrganiserView {
  entity: OrganiserEntity;
  kind: 'community' | 'association';
  standing: OrganiserStanding;
  /** Joining needs a payment (the organiser community is paid). */
  paid: boolean;
  /** Joining needs an admin's approval. */
  needsApproval: boolean;
  /** Only an invitation gets someone in; the event page cannot request it. */
  inviteOnly: boolean;
  /** Where to send the person: the community / association page. */
  href: string;
}

export function organiserStanding(status?: string | null): OrganiserStanding {
  const s = String(status ?? '').toUpperCase();
  if (s === 'ACTIVE') return 'member';
  if (s === 'PENDING' || s === 'PENDING_PAYMENT' || s === 'PENDING_APPROVAL') return 'pending';
  if (s === 'SUSPENDED' || s === 'BANNED') return 'suspended';
  return 'none';
}

export function buildOrganiserView(entity: OrganiserEntity, kind: 'community' | 'association'): OrganiserView {
  const paymentType = String(entity.paymentType ?? '').toUpperCase();
  const joinPolicy = String(entity.joinPolicy ?? 'OPEN').toUpperCase();
  return {
    entity,
    kind,
    standing: organiserStanding(entity.membershipStatus),
    paid: paymentType === 'ONE_TIME' || paymentType === 'SUBSCRIPTION',
    needsApproval: joinPolicy === 'REQUEST',
    inviteOnly: joinPolicy === 'INVITE_ONLY',
    href: `/${kind}/${entity.id}`,
  };
}

/** Whether the organiser can be joined from an event at all (right now, by this person). */
export function canJoinFromEvent(o: OrganiserView): boolean {
  return o.standing === 'none' && !o.paid && !o.inviteOnly;
}
