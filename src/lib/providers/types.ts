import type { ReactNode } from "react";

/**
 * A provider is one external service (chess.com, Spotify, Strava, ...) that a
 * Tap user can link to their profile. Each provider lives in its own folder
 * under src/lib/providers/<id>/ and is registered in ./registry.ts.
 *
 * To add a new service:
 *   1. Create src/lib/providers/<id>/ with a fetcher and a card component.
 *   2. Export a `Provider` object from its index.tsx.
 *   3. Add it to `providers` in ./registry.ts.
 */

/** Public identity of the linked account, shown in the profile header. */
export interface LinkedIdentity {
  username: string;
  displayName: string;
  avatarUrl?: string;
  profileUrl: string;
  /** ISO 3166-1 alpha-2 code, if the service exposes one. */
  countryCode?: string;
  /** Unix seconds. */
  joinedAt?: number;
}

/** A small headline number every provider can surface (used in previews). */
export interface Highlight {
  label: string;
  value: string;
}

export type ProviderResult<TData> =
  | {
      ok: true;
      identity: LinkedIdentity;
      highlights: Highlight[];
      data: TData;
    }
  | {
      ok: false;
      error: "not_found" | "upstream_error";
      message: string;
    };

export interface Provider<TData = unknown> {
  /** Stable id, also used as the URL query key, e.g. `chesscom`. */
  id: string;
  name: string;
  /** Accent color for this provider's section on the card. */
  accent: string;
  /** Label for the account field on the link form, e.g. "chess.com username". */
  accountLabel: string;
  accountPlaceholder: string;
  /** Returns an error message, or null when the input looks valid. */
  validateAccount(input: string): string | null;
  /** Normalizes user input (trim, lowercase, strip URL) into an account id. */
  normalizeAccount(input: string): string;
  fetchAccount(account: string): Promise<ProviderResult<TData>>;
  /** Renders this provider's section of the profile card. */
  renderSection(data: TData, identity: LinkedIdentity): ReactNode;
}

/** A service shown on the link screen that isn't integrated yet. */
export interface UpcomingProvider {
  id: string;
  name: string;
  accent: string;
}
