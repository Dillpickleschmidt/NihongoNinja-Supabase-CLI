import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = Bun.env.SUPABASE_URL
const SERVICE_ROLE_KEY = Bun.env.SUPABASE_SERVICE_ROLE

export default function createSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase URL and Service Role Key are required.")
  }

  // Create a Supabase client
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}
