import { chesscom } from "./chesscom";
import { spotify } from "./spotify";
import { steam } from "./steam";
import { strava } from "./strava";
import type { Provider, UpcomingProvider } from "./types";

/** Integrations that have a public profile card, in the order they appear on it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const providers: Provider<any>[] = [chesscom];

/** Services linked with a Connect button (OAuth / OpenID); they feed the activity stream. */
export const connectable: Provider[] = [spotify, strava, steam];

/** Every provider that can produce feed items. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const all: Provider<any>[] = [...providers, ...connectable];

/** Shown on the link screen as "coming soon". */
export const upcoming: UpcomingProvider[] = [
  { id: "xbox", name: "Xbox", accent: "#107c10" },
  { id: "epic", name: "Epic Games", accent: "#a0a0a0" },
];

export function getProvider(id: string) {
  return all.find((p) => p.id === id);
}
