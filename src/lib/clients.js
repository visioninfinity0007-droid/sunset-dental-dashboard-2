export const CLIENTS = {
  "sunset-dental": {
    slug:    "sunset-dental",
    name:    "Sunset Dental Care",
    logo:    "🦷",
    tagline: "Lead Dashboard",
  },
};

function toEnvPrefix(slug) {
  return slug.toUpperCase().replace(/-/g, "_");
}

export function getClientEmail(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_EMAIL`] ?? null;
}
export function getClientPassword(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_PASSWORD`] ?? null;
}
export function getClientSheetId(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_SHEET_ID`] ?? process.env.GOOGLE_SHEET_ID ?? null;
}
export function getClientStatsUrl(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_STATS_URL`] ?? null;
}
export function getClientLeadsUrl(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_LEADS_URL`] ?? null;
}
export function findClientByCredentials(email, password) {
  const normalizedEmail = (email ?? "").toLowerCase().trim();
  for (const [slug, client] of Object.entries(CLIENTS)) {
    const allowedEmail    = (getClientEmail(slug) ?? "").toLowerCase();
    const allowedPassword = getClientPassword(slug);
    if (allowedEmail && allowedPassword && normalizedEmail === allowedEmail && password === allowedPassword) {
      return { slug, client };
    }
  }
  return null;
}
export function getClient(slug) {
  return CLIENTS[slug] ?? null;
}
