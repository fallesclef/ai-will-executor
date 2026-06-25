export type ReadingScrollMode = "top" | "hub-focus";

/**
 * Reset scroll after navigating between console, evidence nodes, and endings.
 * On mobile the page scrolls; on desktop `.game-main` may be the scroll container.
 */
export function resetReadingScroll(
  mainEl: HTMLElement | null,
  mode: ReadingScrollMode
): void {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (mainEl) mainEl.scrollTop = 0;

  if (mode !== "hub-focus" || !mainEl) return;

  const target =
    mainEl.querySelector<HTMLElement>(".nav-btn__badge--pending")?.closest(
      ".nav-btn"
    ) ??
    mainEl.querySelector<HTMLElement>(
      ".nav-btn:not(.nav-btn--viewed):not(.nav-btn--disabled)"
    );

  if (target) {
    target.scrollIntoView({ block: "start", behavior: "auto" });
  }
}
