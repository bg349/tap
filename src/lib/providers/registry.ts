import { chesscom } from "./chesscom";
import type { Provider, UpcomingProvider } from "./types";

/** Live integrations, in the order they appear on a profile. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const providers: Provider<any>[] = [chesscom];

/** Shown on the link screen as "coming soon". */
export const upcoming: UpcomingProvider[] = [
  { id: "spotify", name: "Spotify", accent: "#1db954" },
  { id: "xbox", name: "Xbox", accent: "#107c10" },
  { id: "epic", name: "Epic Games", accent: "#a0a0a0" },
  { id: "strava", name: "Strava", accent: "#fc4c02" },
  { id: "steam", name: "Steam", accent: "#66c0f4" },
];

export function getProvider(id: string) {
  return providers.find((p) => p.id === id);
}
