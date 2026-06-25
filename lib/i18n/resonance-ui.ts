export function resonanceTierLabel(
  tierLevel: number,
  t: (key: string) => string
): string {
  if (tierLevel < 1) return t("resonance.dormant");
  const key = `resonance.tierLabel${tierLevel}` as
    | "resonance.tierLabel1"
    | "resonance.tierLabel2"
    | "resonance.tierLabel3"
    | "resonance.tierLabel4";
  return t(key);
}

export function resonanceStatusLabel(
  status: "stable" | "warning" | "critical",
  tierLevel: number,
  t: (key: string) => string
): string {
  if (tierLevel > 0) return resonanceTierLabel(tierLevel, t);
  switch (status) {
    case "critical":
      return t("resonance.statusCriticalThreshold");
    case "warning":
      return t("resonance.statusWarning");
    default:
      return t("resonance.statusMonitoring");
  }
}

export function resonanceNextUnlockHint(
  tierLevel: number,
  t: (key: string) => string
): string | null {
  const hints: Record<number, string> = {
    0: "resonance.nextUnlockD173",
    1: "resonance.nextUnlockD206",
    2: "resonance.nextUnlockD301",
    3: "resonance.nextUnlockD399",
  };
  const key = hints[tierLevel];
  return key ? t(key) : null;
}
