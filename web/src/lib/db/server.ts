import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

export function createAdminDbClient() {
  const env = getServerEnv();

  return createClient(env.SUPABASE_URL ?? "", env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
