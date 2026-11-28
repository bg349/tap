import "server-only";

// Data hooks for the homepage. The friends/feed thread replaces the bodies
// of these two functions with real queries; the UI only depends on the types.

export type Friend = {
  id: string;
  handle: string;
  name: string;
  avatarUrl?: string | null;
  /** Active right now (shows a green dot). */
  active: boolean;
  /** Has new activity you haven't seen (shows a ring). */
  hasNew: boolean;
};

export type FeedItem = {
  id: string;
  friend: Pick<Friend, "id" | "handle" | "name" | "avatarUrl">;
  /** e.g. "won a rapid game on chess.com" */
  text: string;
  /** Source id from the provider registry, e.g. "chesscom". */
  source?: string;
  /** ISO timestamp. */
  at: string;
  reactions: number;
  reacted: boolean;
};

export async function getFriends(_userId: string): Promise<Friend[]> {
  return [];
}

export async function getFeed(_userId: string): Promise<FeedItem[]> {
  return [];
}
