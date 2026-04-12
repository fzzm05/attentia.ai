"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { getPublicEnv } from "@/lib/env";

export function getFirebaseApp() {
  const env = getPublicEnv();

  if (
    !env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    !env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    throw new Error("Firebase client environment variables are missing.");
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
