import { ActivityRow } from "@/components/feed/ActivityRow";
import { getJson, noCard, postForm } from "../linked";
import type { FeedEvent, Provider, TokenSet } from "../types";

const clientId = () => process.env.SPOTIFY_CLIENT_ID ?? "";
const basic = () => `Basic ${Buffer.from(`${clientId()}:${process.env.SPOTIFY_CLIENT_SECRET ?? ""}`).toString("base64")}`;
const SCOPES = "user-read-recently-played user-read-currently-playing";

interface TokenResponse { access_token: string; refresh_token?: string; expires_in: number }
const toTokens = (t: TokenResponse, fallbackRefresh?: string): TokenSet => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token ?? fallbackRefresh,
  expiresAt: Math.floor(Date.now() / 1000) + t.expires_in,
});

interface Played {
  played_at: string;
  track: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    external_urls: { spotify?: string };
  };
}

export const spotify: Provider = {
  ...noCard,
  id: "spotify",
  name: "Spotify",
  accent: "#1db954",
  connect: {
    isConfigured: () => Boolean(clientId() && process.env.SPOTIFY_CLIENT_SECRET),
    begin: (origin, state) =>
      "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: clientId(),
        scope: SCOPES,
        redirect_uri: `${origin}/connect/spotify/callback`,
        state,
      }),
    async complete(params, origin) {
      const code = params.get("code");
      if (!code) throw new Error("Spotify didn't send a code.");
      const t = await postForm<TokenResponse>(
        "https://accounts.spotify.com/api/token",
        { grant_type: "authorization_code", code, redirect_uri: `${origin}/connect/spotify/callback` },
        { authorization: basic() },
      );
      const me = await getJson<{ id: string; display_name?: string }>("https://api.spotify.com/v1/me", {
        headers: { authorization: `Bearer ${t.access_token}` },
      });
      return { account: me.display_name || me.id, tokens: toTokens(t) };
    },
    async refresh(refreshToken) {
      const t = await postForm<TokenResponse>(
        "https://accounts.spotify.com/api/token",
        { grant_type: "refresh_token", refresh_token: refreshToken },
        { authorization: basic() },
      );
      return toTokens(t, refreshToken);
    },
    describe: (account) => account,
  },
  async fetchEvents(_account, accessToken): Promise<FeedEvent[]> {
    if (!accessToken) return [];
    const { items } = await getJson<{ items: Played[] }>("https://api.spotify.com/v1/me/player/recently-played?limit=15", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    return items.map(({ played_at, track }) => ({
      externalId: `${played_at}:${track.id}`,
      kind: "listen",
      title: track.name,
      detail: `${track.artists.map((a) => a.name).join(", ")} · ${track.album.name}`,
      payload: { url: track.external_urls.spotify ?? null, image: track.album.images.at(-2)?.url ?? track.album.images[0]?.url ?? null },
      occurredAt: new Date(played_at).toISOString(),
    }));
  },
  renderEvent: (item) => (
    <ActivityRow
      title={item.title}
      detail={item.detail}
      emoji="🎧"
      imageUrl={typeof item.payload.image === "string" ? item.payload.image : undefined}
      href={typeof item.payload.url === "string" ? item.payload.url : undefined}
    />
  ),
};
