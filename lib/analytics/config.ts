/** GA4 Measurement ID, e.g. G-XXXXXXXXXX */
export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

/**
 * GA runs when an ID is set and not explicitly disabled.
 * Default: production only. Set NEXT_PUBLIC_GA_ENABLED=true to test locally.
 */
export function isGaEnabled(): boolean {
  if (!getGaMeasurementId()) return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function isGaEnabledClient(): boolean {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_GA_ENABLED === "true") return true;
  return process.env.NODE_ENV === "production";
}
