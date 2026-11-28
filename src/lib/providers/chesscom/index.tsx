import type { Provider } from "../types";
import { fetchChessAccount, type ChessData } from "./api";
import { ChessEvent } from "./ChessEvent";
import { fetchChessEvents } from "./events";
import { ChessSection } from "./ChessSection";

export const chesscom: Provider<ChessData> = {
  id: "chesscom",
  name: "Chess.com",
  accent: "#7fa650",
  accountLabel: "chess.com username",
  accountPlaceholder: "e.g. hikaru",
  normalizeAccount(input) {
    // Accept a pasted profile URL like https://www.chess.com/member/Hikaru
    const fromUrl = input.match(/chess\.com\/(?:member|players?)\/([^/?#]+)/i)?.[1];
    return (fromUrl ?? input).trim().replace(/^@/, "").toLowerCase();
  },
  validateAccount(input) {
    const u = this.normalizeAccount(input);
    if (!u) return "Enter a username.";
    if (!/^[a-z0-9_-]{3,25}$/.test(u)) return "That doesn't look like a chess.com username.";
    return null;
  },
  fetchAccount: fetchChessAccount,
  fetchEvents: fetchChessEvents,
  renderEvent: (item) => <ChessEvent item={item} />,
  renderSection: (data) => <ChessSection data={data} />,
};
