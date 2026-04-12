import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";

import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "attentia_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export async function createSessionCookie(idToken: string) {
  const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAuthenticatedSession(): Promise<DecodedIdToken | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}
