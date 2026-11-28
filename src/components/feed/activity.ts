/** Generic, source-keyed wording so new services drop in; unknown sources fall back to their title. */
const VERBS: Record<string, Record<string, string>> = {
  chesscom: { game: "finished a game", milestone: "hit a new rating high" },
  spotify: { listening: "is listening to", track: "played" },
  strava: { run: "completed a run", ride: "completed a ride", activity: "finished a workout" },
  steam: { playing: "is playing", achievement: "unlocked an achievement" },
};
const ICONS: Record<string, string> = { chesscom: "♟", spotify: "♪", strava: "↗", steam: "🎮" };

export function verbFor(source: string, kind: string) {
  return VERBS[source]?.[kind] ?? "did something";
}
export const iconFor = (source: string) => ICONS[source] ?? "•";

/** Posts newer than this count as "live". */
export const LIVE_MS = 15 * 60_000;
