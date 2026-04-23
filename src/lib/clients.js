/**
 * Vision Infinity — Multi-Tenant Client Registry
 *
 * HOW TO ADD A NEW CLIENT:
 * 1. Add an entry to CLIENTS below (slug, name, logo, tagline)
 * 2. Add 3 env vars in Coolify:
 *      CLIENT_{SLUG_UPPER}_EMAIL      e.g. CLIENT_CLAWED_MEEBU_EMAIL
 *      CLIENT_{SLUG_UPPER}_PASSWORD   e.g. CLIENT_CLAWED_MEEBU_PASSWORD
 *      CLIENT_{SLUG_UPPER}_SHEET_ID   e.g. CLIENT_CLAWED_MEEBU_SHEET_ID
 * 3. git push — that's it. No other code changes needed.
 *
 * Slug rules: lowercase, hyphens only (e.g. "sunset-dental")
 * Env prefix: uppercase, underscores  (e.g. "SUNSET_DENTAL")
 */

export const CLIENTS = {
  "sunset-dental": {
    slug:    "sunset-dental",
    name:    "Sunset Dental Care",
    logo:    "🦷",
    tagline: "Lead Dashboard",
  },

  // ── Add new clients below ────────────────────────────────────────────────
  // "clawed-by-meebu": {
  //   slug:    "clawed-by-meebu",
  //   name:    "Clawed by Meebu",
  //   logo:    "💅",
  //   tagline: "Client Dashboard",
  // },
  // "allah-wala-biryani": {
  //   slug:    "allah-wala-biryani",
  //   name:    "Allah Wala Biryani",
  //   logo:    "🍛",
  //   tagline: "Orders Dashboard",
  // },
};

// ─── Env var helpers ──────────────────────────────────────────────────────

/** "sunset-dental" → "SUNSET_DENTAL" */
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
  // Per-client sheet ID takes priority, falls back to legacy global var
  return (
    process.env[`CLIENT_${toEnvPrefix(slug)}_SHEET_ID`] ??
    process.env.GOOGLE_SHEET_ID ??
    null
  );
}

export function getClientStatsUrl(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_STATS_URL`] ?? null;
}

export function getClientLeadsUrl(slug) {
  return process.env[`CLIENT_${toEnvPrefix(slug)}_LEADS_URL`] ?? null;
}

// ─── Auth lookup ──────────────────────────────────────────────────────────

/**
 * Given email + password, find the matching client.
 * Returns { slug, client } or null.
 */
export function findClientByCredentials(email, password) {
  const normalizedEmail = (email ?? "").toLowerCase().trim();

  for (const [slug, client] of Object.entries(CLIENTS)) {
    const allowedEmail    = (getClientEmail(slug) ?? "").toLowerCase();
    const allowedPassword = getClientPassword(slug);

    if (
      allowedEmail &&
      allowedPassword &&
      normalizedEmail === allowedEmail &&
      password === allowedPassword
    ) {
      return { slug, client };
    }
  }
  return null;
}

/** Look up a client by slug. Returns null if slug is unknown. */
export function getClient(slug) {
  return CLIENTS[slug] ?? null;
}
