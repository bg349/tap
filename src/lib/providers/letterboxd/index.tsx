import type { Provider } from "../types";
import { fetchLetterboxdAccount, type LetterboxdData } from "./api";
import { fetchLetterboxdEvents } from "./events";
import { LetterboxdEvent } from "./LetterboxdEvent";
import { LetterboxdSection } from "./LetterboxdSection";

export const letterboxd: Provider<LetterboxdData> = {
  id: "letterboxd",
  name: "Letterboxd",
  accent: "#00e054",
  accountLabel: "Letterboxd username",
  accountPlaceholder: "e.g. dave",
  normalizeAccount(input) {
    const fromUrl = input.match(/letterboxd\.com\/([^/?#\s]+)/i)?.[1];
    return (fromUrl ?? input).trim().replace(/^@/, "").toLowerCase();
  },
  validateAccount(input) {
    const u = this.normalizeAccount(input);
    if (!u) return "Enter a username.";
    if (!/^[a-z0-9_]{2,30}$/.test(u)) return "That doesn't look like a Letterboxd username.";
    return null;
  },
  fetchAccount: fetchLetterboxdAccount,
  fetchEvents: fetchLetterboxdEvents,
  renderEvent: (item) => <LetterboxdEvent item={item} />,
  renderSection: (data) => <LetterboxdSection data={data} />,
};
