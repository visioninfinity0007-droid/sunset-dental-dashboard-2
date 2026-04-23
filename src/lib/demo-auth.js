const EMAIL_COOKIE = "vi_email";

/** Read client email from the non-httpOnly cookie set by the server. */
export function getClientEmail() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${EMAIL_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** Legacy alias used by dashboard page. */
export function getDemoEmail() {
  return getClientEmail();
}

/** Clear the session — just calls the API, cookies are cleared server-side. */
export async function clearDemoSession() {
  await fetch("/api/auth", { method: "DELETE" });
}

/** No-op — kept for backward compat. Session is now set server-side. */
export function setDemoSession() {}

/** Check if there is any session cookie present. */
export function hasDemoSession() {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("vi_session=");
}
