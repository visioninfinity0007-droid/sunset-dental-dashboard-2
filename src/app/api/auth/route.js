import { NextResponse } from "next/server";
import { findClientByCredentials } from "@/lib/clients";

const SESSION_COOKIE = "vi_session";
const EMAIL_COOKIE   = "vi_email";
const SESSION_TTL    = 60 * 60 * 8;

function makeSessionValue(slug, email) {
  const payload = { s: slug, e: email, x: Math.floor(Date.now() / 1000) + SESSION_TTL };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const match = findClientByCredentials(email, password);
  if (match) {
    const { slug } = match;
    const res = NextResponse.json({ ok: true, slug });
    res.cookies.set(SESSION_COOKIE, makeSessionValue(slug, email), { httpOnly: true, path: "/", maxAge: SESSION_TTL, sameSite: "lax" });
    res.cookies.set(EMAIL_COOKIE, email, { httpOnly: false, path: "/", maxAge: SESSION_TTL, sameSite: "lax" });
    return res;
  }
  return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(EMAIL_COOKIE,   "", { path: "/", maxAge: 0 });
  return res;
}
