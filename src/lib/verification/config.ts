/** Services that prove ownership with a one-time code placed in a public profile field. */
export type CodeSource = "chesscom" | "lastfm" | "letterboxd" | "xbox";

export interface CodeService {
  name: string;
  accountLabel: string;
  placeholder: string;
  /** Where the code goes, shown to the user. */
  field: string;
  /** Click-by-click steps. */
  steps: string[];
  editUrl: string;
}

export const CODE_SERVICES: Record<CodeSource, CodeService> = {
  chesscom: {
    name: "Chess.com",
    accountLabel: "Your chess.com username",
    placeholder: "e.g. hikaru",
    field: "Location",
    editUrl: "https://www.chess.com/settings",
    steps: [
      "Open chess.com/settings and sign in.",
      "Find the Location box.",
      "Paste the code into Location (you can put it after your city). Click Save.",
      "Come back here and press “Check now”.",
    ],
  },
  lastfm: {
    name: "Last.fm",
    accountLabel: "Your Last.fm username",
    placeholder: "e.g. rj",
    field: "About me",
    editUrl: "https://www.last.fm/settings",
    steps: [
      "Open last.fm/settings and sign in.",
      "Paste the code into the About me box. Click Save changes.",
      "Come back here and press “Check now”.",
    ],
  },
  letterboxd: {
    name: "Letterboxd",
    accountLabel: "Your Letterboxd username",
    placeholder: "e.g. dave",
    field: "Bio",
    editUrl: "https://letterboxd.com/settings/",
    steps: [
      "Open letterboxd.com/settings and sign in.",
      "Paste the code into the Bio box. Click Save Changes.",
      "Come back here and press “Check now”.",
    ],
  },
  xbox: {
    name: "Xbox",
    accountLabel: "Your Xbox gamertag",
    placeholder: "e.g. Major Nelson",
    field: "Bio",
    editUrl: "https://www.xbox.com/en-US/play/user/",
    steps: [
      "On your Xbox or the Xbox mobile app, open your profile and choose Customize profile.",
      "Paste the code into the Bio box and save. (On the web: account.xbox.com/en-us/Profile, then Customize.)",
      "Make sure your profile is public, wait a minute, then come back here and press “Check now”.",
    ],
  },
};

export const isCodeSource = (s: string): s is CodeSource => s in CODE_SERVICES;

export type LinkStatus = "none" | "unverified" | "pending" | "expired" | "verified";

export interface LinkView {
  account: string | null;
  status: LinkStatus;
  code: string | null;
  expiresAt: string | null;
  audience: "only-me" | "friends";
  paused: boolean;
}
