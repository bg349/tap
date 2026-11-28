import { ActivityRow } from "@/components/feed/ActivityRow";
import { getJson, noCard } from "../linked";
import type { FeedEvent, Provider } from "../types";

const OPENID = "https://steamcommunity.com/openid/login";
const apiKey = () => process.env.STEAM_API_KEY ?? "";
const hours = (min: number) => `${(min / 60).toFixed(min < 600 ? 1 : 0).replace(/\.0$/, "")} hr${min === 60 ? "" : "s"}`;

interface Game { appid: number; name: string; playtime_2weeks?: number; playtime_forever: number; img_icon_url?: string }

export const steam: Provider = {
  ...noCard,
  id: "steam",
  name: "Steam",
  accent: "#66c0f4",
  connect: {
    // Sign-in uses Steam's OpenID (no secret); the Web API key reads recent games.
    isConfigured: () => Boolean(apiKey()),
    begin: (origin, state) =>
      `${OPENID}?` +
      new URLSearchParams({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": `${origin}/connect/steam/callback?state=${state}`,
        "openid.realm": origin,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
      }),
    async complete(params, origin) {
      const id = params.get("openid.claimed_id")?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1];
      const returnTo = params.get("openid.return_to") ?? "";
      if (!id || !returnTo.startsWith(`${origin}/connect/steam/callback`)) throw new Error("Steam sign-in didn't check out.");
      // Ask Steam to confirm it signed this response.
      const verify = new URLSearchParams(params);
      verify.set("openid.mode", "check_authentication");
      const res = await fetch(OPENID, { method: "POST", body: verify, cache: "no-store" });
      if (!res.ok || !(await res.text()).includes("is_valid:true")) throw new Error("Steam sign-in didn't check out.");
      return { account: id };
    },
    describe: (account) => `Steam ID …${account.slice(-6)}`,
  },
  async fetchEvents(account): Promise<FeedEvent[]> {
    const { response } = await getJson<{ response: { games?: Game[] } }>(
      "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?" +
        new URLSearchParams({ key: apiKey(), steamid: account, count: "5" }),
    );
    const now = new Date().toISOString();
    return (response.games ?? [])
      .filter((g) => (g.playtime_2weeks ?? 0) > 0)
      .map((g) => ({
        // Changes whenever total playtime grows, so each new session shows up once.
        externalId: `${g.appid}:${g.playtime_forever}`,
        kind: "played",
        title: `Played ${g.name}`,
        detail: `${hours(g.playtime_2weeks ?? 0)} in the last 2 weeks · ${hours(g.playtime_forever)} total`,
        payload: {
          url: `https://store.steampowered.com/app/${g.appid}`,
          image: g.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : null,
        },
        occurredAt: now,
      }));
  },
  renderEvent: (item) => (
    <ActivityRow
      title={item.title}
      detail={item.detail}
      emoji="🎮"
      imageUrl={typeof item.payload.image === "string" ? item.payload.image : undefined}
      href={typeof item.payload.url === "string" ? item.payload.url : undefined}
    />
  ),
};
