import { createBrowserClient } from '@supabase/ssr'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return cached instance if it exists (browser only)
  if (typeof window !== 'undefined' && clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During SSR/build, if variables are missing, create a dummy client
  // This should never be used in actual runtime
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found - using placeholder')
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'
    )
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  // Cache the client instance in browser
  if (typeof window !== 'undefined') {
    clientInstance = client
  }
  
  return client
}

