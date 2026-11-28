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

/** One thing that happened on a linked account; becomes a row in `items`. */
export interface FeedEvent {
  /** Stable per account so re-syncing never duplicates it. */
  externalId: string;
  kind: string;
  title: string;
  detail?: string;
  payload: Record<string, unknown>;
  /** ISO timestamp of when it happened on the service. */
  occurredAt: string;
}

/** A stored event as the feed shows it. */
export interface FeedItem {
  id: string;
  source: string;
  kind: string;
  title: string;
  detail: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
}

/** Tokens kept for an OAuth-linked account (in `connection_secrets`). */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Unix seconds. */
  expiresAt?: number;
}

/**
 * How a service is linked with a "Connect" button instead of a typed
 * username. `begin` returns the URL to send the user to; `complete` runs on
 * the callback and returns the account id (plus tokens, for OAuth services).
 */
export interface ConnectConfig {
  /** False until the developer app's credentials are set; the UI then says "coming soon". */
  isConfigured(): boolean;
  begin(origin: string, state: string): string;
  complete(params: URLSearchParams, origin: string): Promise<{ account: string; tokens?: TokenSet }>;
  /** Present for services whose API needs a (refreshable) access token. */
  refresh?(refreshToken: string): Promise<TokenSet>;
  /** Friendly text for the linked account on the account page. */
  describe(account: string): string;
}

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
  /** Recent activity for the feed. Throw if the service is unreachable so the sync is retried; return [] for "nothing / no such account". */
  fetchEvents(account: string, accessToken?: string): Promise<FeedEvent[]>;
  /** Set for services linked through a Connect button (Spotify, Strava, Steam). */
  connect?: ConnectConfig;
  /** Renders one feed row for an event this provider produced. */
  renderEvent(item: FeedItem): ReactNode;
  /** Renders this provider's section of the profile card. */
  renderSection(data: TData, identity: LinkedIdentity): ReactNode;
}

/** A service shown on the link screen that isn't integrated yet. */
export interface UpcomingProvider {
  id: string;
  name: string;
  accent: string;
}
