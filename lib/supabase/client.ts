import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, environment variables might not be available
  // Return a mock client to prevent build errors
  if (!supabaseUrl || !supabaseAnonKey) {
    // Only throw in browser/runtime, not during build
    if (typeof window !== 'undefined') {
      throw new Error('Missing Supabase environment variables')
    }
    // Return a dummy client for build time
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

