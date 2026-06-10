function normalizeApiUrl(value: string | undefined): string {
  const trimmed = value?.trim().replace(/\/+$/, "") ?? "";
  if (!trimmed) {
    return "";
  }

  const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed);
  if (process.env.NODE_ENV === "production" && pointsToLocalhost) {
    return "";
  }

  return trimmed;
}

const configuredApiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const API_URL =
  process.env.NODE_ENV === "production" ? "/api/backend" : configuredApiUrl || "http://localhost:8000";
