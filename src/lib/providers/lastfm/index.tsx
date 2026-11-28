import type { Provider } from "../types";
import { fetchLastfmAccount, fetchLastfmEvents, type LastfmData } from "./api";
import { LastfmEvent } from "./LastfmEvent";
import { LastfmSection } from "./LastfmSection";

export const lastfm: Provider<LastfmData> = {
  id: "lastfm",
  name: "Last.fm",
  accent: "#d51007",
  accountLabel: "Last.fm username",
  accountPlaceholder: "e.g. rj",
  normalizeAccount(input) {
    const fromUrl = input.match(/last\.fm\/(?:[a-z-]+\/)?user\/([^/?#]+)/i)?.[1];
    return decodeURIComponent(fromUrl ?? input).trim().replace(/^@/, "");
  },
  validateAccount(input) {
    const u = this.normalizeAccount(input);
    if (!u) return "Enter a username.";
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,14}$/.test(u)) return "That doesn't look like a Last.fm username.";
    return null;
  },
  fetchAccount: fetchLastfmAccount,
  fetchEvents: fetchLastfmEvents,
  renderEvent: (item) => <LastfmEvent item={item} />,
  renderSection: (data) => <LastfmSection data={data} />,
};
