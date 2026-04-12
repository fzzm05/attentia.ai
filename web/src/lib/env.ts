const requiredPublicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const requiredServerEnv = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export function getPublicEnv() {
  return requiredPublicEnv;
}

export function getServerEnv() {
  return requiredServerEnv;
}

export function hasFirebaseClientEnv() {
  return Boolean(
    requiredPublicEnv.NEXT_PUBLIC_FIREBASE_API_KEY &&
      requiredPublicEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      requiredPublicEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}

export function hasServerPlatformEnv() {
  return Boolean(
    requiredServerEnv.FIREBASE_PROJECT_ID &&
      requiredServerEnv.FIREBASE_CLIENT_EMAIL &&
      requiredServerEnv.FIREBASE_PRIVATE_KEY &&
      requiredServerEnv.SUPABASE_URL &&
      requiredServerEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function hasRequiredEnv() {
  return hasFirebaseClientEnv() && hasServerPlatformEnv();
}
