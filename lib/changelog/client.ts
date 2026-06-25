const STORAGE_KEY = "awe-changelog-seen";

export function getSeenChangelogVersion(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function markChangelogSeen(version: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, version);
}

export function hasUnreadChangelog(latestVersion: string): boolean {
  return getSeenChangelogVersion() !== latestVersion;
}
