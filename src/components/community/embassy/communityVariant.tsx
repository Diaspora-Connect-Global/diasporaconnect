'use client';
import { createContext, useContext, type ReactNode } from 'react';
export type CommunityVariant = 'embassy' | 'general';
const Ctx = createContext<CommunityVariant>('general');
export function CommunityVariantProvider({ variant, children }: { variant: CommunityVariant; children: ReactNode }) {
  return <Ctx.Provider value={variant}>{children}</Ctx.Provider>;
}
export function useCommunityVariant(): CommunityVariant { return useContext(Ctx); }
export function useIsEmbassy(): boolean { return useContext(Ctx) === 'embassy'; }
/** 'Embassy' for embassy communities, otherwise 'Community' — the most common copy swap. */
export function useCommunityNoun(): string { return useContext(Ctx) === 'embassy' ? 'Embassy' : 'Community'; }
