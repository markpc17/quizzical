import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Untyped admin client — use when the Supabase generic type machinery causes
 * `never` inference issues (e.g. insert/update with partial fields).
 * Callers are responsible for typing the returned data themselves.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClientUntyped(): ReturnType<typeof createClient<any>> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
