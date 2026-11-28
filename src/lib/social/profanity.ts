const BAD =
  /(^|[^a-z])(fuck\w*|f+u+c+k+\w*|shit\w*|bitch\w*|cunt\w*|asshole\w*|bastard\w*|dick(head)?s?|pussy|whore\w*|slut\w*|nigg\w*|fag(got)?s?|retard\w*|twat\w*|wank\w*|bullshit)([^a-z]|$)/;

/** Matches the database check: lowercases and un-leetspeaks before testing a small word list. */
export function hasProfanity(text: string): boolean {
  const map: Record<string, string> = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "$": "s", "@": "a", "!": "i" };
  return BAD.test(text.toLowerCase().replace(/[01345$@!]/g, (c) => map[c] ?? c));
}
