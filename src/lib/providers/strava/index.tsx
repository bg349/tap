import { ActivityRow } from "@/components/feed/ActivityRow";
import { getJson, noCard, postForm } from "../linked";
import type { FeedEvent, Provider, TokenSet } from "../types";

const clientId = () => process.env.STRAVA_CLIENT_ID ?? "";
const secret = () => process.env.STRAVA_CLIENT_SECRET ?? "";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; username?: string | null; firstname?: string; lastname?: string };
}
const toTokens = (t: TokenResponse): TokenSet => ({ accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at });

interface Activity {
  id: number;
  name: string;
  sport_type?: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  total_elevation_gain?: number;
}

const EMOJI: Record<string, string> = {
  Run: "🏃", TrailRun: "🏃", Ride: "🚴", VirtualRide: "🚴", MountainBikeRide: "🚵", GravelRide: "🚴",
  Swim: "🏊", Walk: "🚶", Hike: "🥾", Workout: "💪", WeightTraining: "🏋️", Yoga: "🧘", Rowing: "🚣",
  NordicSki: "⛷️", AlpineSki: "⛷️", Snowboard: "🏂", Soccer: "⚽", Tennis: "🎾", Golf: "⛳", Climb: "🧗",
};
const sportName = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2");

function duration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
}

export const strava: Provider = {
  ...noCard,
  id: "strava",
  name: "Strava",
  accent: "#fc4c02",
  connect: {
    isConfigured: () => Boolean(clientId() && secret()),
    begin: (origin, state) =>
      "https://www.strava.com/oauth/authorize?" +
      new URLSearchParams({
        client_id: clientId(),
        response_type: "code",
        redirect_uri: `${origin}/connect/strava/callback`,
        approval_prompt: "auto",
        scope: "read,activity:read",
        state,
      }),
    async complete(params) {
      const code = params.get("code");
      if (!code) throw new Error("Strava didn't send a code.");
      if (!params.get("scope")?.includes("activity:read")) {
        throw new Error("Tap needs permission to read your activities. Try again and leave that box ticked.");
      }
      const t = await postForm<TokenResponse>("https://www.strava.com/oauth/token", {
        client_id: clientId(), client_secret: secret(), code, grant_type: "authorization_code",
      });
      const a = t.athlete;
      const name = a?.username || [a?.firstname, a?.lastname].filter(Boolean).join(" ") || String(a?.id ?? "athlete");
      return { account: name, tokens: toTokens(t) };
    },
    async refresh(refreshToken) {
      return toTokens(
        await postForm<TokenResponse>("https://www.strava.com/oauth/token", {
          client_id: clientId(), client_secret: secret(), grant_type: "refresh_token", refresh_token: refreshToken,
        }),
      );
    },
    describe: (account) => account,
  },
  async fetchEvents(_account, accessToken): Promise<FeedEvent[]> {
    if (!accessToken) return [];
    const acts = await getJson<Activity[]>("https://www.strava.com/api/v3/athlete/activities?per_page=20", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return acts.map((a) => {
      const sport = a.sport_type ?? a.type;
      const km = a.distance / 1000;
      return {
        externalId: String(a.id),
        kind: "activity",
        title: a.name,
        detail: [sportName(sport), km >= 0.1 ? `${km.toFixed(km < 10 ? 2 : 1)} km` : null, duration(a.moving_time)].filter(Boolean).join(" · "),
        payload: { url: `https://www.strava.com/activities/${a.id}`, sport },
        occurredAt: new Date(a.start_date).toISOString(),
      };
    });
  },
  renderEvent: (item) => (
    <ActivityRow
      title={item.title}
      detail={item.detail}
      emoji={EMOJI[String(item.payload.sport)] ?? "🏅"}
      href={typeof item.payload.url === "string" ? item.payload.url : undefined}
    />
  ),
};
