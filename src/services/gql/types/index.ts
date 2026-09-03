/**
 * @fileoverview Central export file for all GraphQL type definitions.
 * Re-exports all types from individual modules for convenient importing.
 * @module services/gql/types
 *
 * @example
 * ```typescript
 * // Import specific types
 * import { Profile, UpdateProfileInput } from '@/services/gql/types';
 *
 * // Or import from specific modules
 * import { LoginInput, LoginResponse } from '@/services/gql/types/signin';
 * ```
 */

// Authentication types
export * from './authentication';

// Connection/Friends types
export * from './connection';

// Education types
export * from './education';

// Groups types
export * from './groups';

// Posts/Feed types
export * from './postsFeed';

// Profile types
export * from './profile';

// Sign-in/Logout types
export * from './signin';

// Skills types
export * from './skills';

// Users/Blocking types
export * from './users';

// Work Experience types
export * from './work_experience';

export * from './opportunities';

// Vendor service types
export * from './vendor';

// Marketplace service types (buyer/user)
export * from './marketplace';

// Recommendation service types (feed ranking, interactions)
export * from './recommendation';

// Circles types (circle governance, projects, challenges, leaderboard, entitlements)
export * from './circles';

// Circles governance read-models (decision history / audit trail, rule versions)
export * from './circles-governance';

// Circle settings screen (discoverability, join mode, archive)
export * from './circles-settings';

// Circle invite links + former-member views (members screen)
export * from './circles-invites';

// Circle plan & subscription screen (catalogue, entitlements usage, change/cancel)
export * from './circles-billing';
