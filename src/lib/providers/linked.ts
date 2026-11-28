import type { Provider, ProviderResult } from "./types";

/** Connect-button services have no public profile card yet; the feed is their home. */
export const noCard: Pick<Provider, "fetchAccount" | "renderSection" | "accountLabel" | "accountPlaceholder" | "validateAccount" | "normalizeAccount"> = {
  accountLabel: "account",
  accountPlaceholder: "",
  normalizeAccount: (input) => input.trim(),
  validateAccount: () => null,
  fetchAccount: async (): Promise<ProviderResult<unknown>> => ({
    ok: false,
    error: "not_found",
    message: "This service shows up in the feed, not on the public card.",
  }),
  renderSection: () => null,
};

/** Fetches JSON and throws on any non-2xx so the feed sync retries later. */
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

export async function postForm<T>(url: string, body: Record<string, string>, headers: Record<string, string> = {}): Promise<T> {
  return getJson<T>(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(body),
  });
}
