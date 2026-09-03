'use client';
import { createContext, useContext, type ReactNode } from 'react';
export type CommunityVariant = 'embassy' | 'general';
/** Which kind of owner entity backs this embassy view. Drives the ownerType
 *  literal every tab sends to the backend (events use the lowercase form,
 *  service/support/resource enums use the uppercase form). */
export type OwnerKind = 'community' | 'association';

interface VariantContextValue {
  variant: CommunityVariant;
  ownerKind: OwnerKind;
}

const Ctx = createContext<VariantContextValue>({ variant: 'general', ownerKind: 'community' });

export function CommunityVariantProvider({
  variant,
  ownerKind = 'community',
  children,
}: {
  variant: CommunityVariant;
  ownerKind?: OwnerKind;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ variant, ownerKind }}>{children}</Ctx.Provider>;
}
export function useCommunityVariant(): CommunityVariant { return useContext(Ctx).variant; }
export function useIsEmbassy(): boolean { return useContext(Ctx).variant === 'embassy'; }
/** 'Embassy' for embassy communities, otherwise 'Community' — the most common copy swap. */
export function useCommunityNoun(): string { return useContext(Ctx).variant === 'embassy' ? 'Embassy' : 'Community'; }
/** Owner kind for this view: 'community' (default) or 'association'. Events send
 *  this lowercase value directly as their `ownerType`. */
export function useOwnerKind(): OwnerKind { return useContext(Ctx).ownerKind; }
/** Uppercase owner enum for service-request / support / resource queries:
 *  'COMMUNITY' | 'ASSOCIATION'. Never returns COMMUNITY for an association view. */
export function useOwnerEnum(): 'COMMUNITY' | 'ASSOCIATION' {
  return useContext(Ctx).ownerKind === 'association' ? 'ASSOCIATION' : 'COMMUNITY';
}
