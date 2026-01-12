'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const createTestUser = async () => {
    setLoading(true)
    setError(null)

    // Generate a unique email with timestamp
    const uniqueEmail = `user${Date.now()}@example.com`
    const password = 'password123'

    console.log('Attempting to create user:', uniqueEmail)

    const { data, error } = await supabase.auth.signUp({
      email: uniqueEmail,
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          test_user: true
        }
      }
    })

    console.log('Response:', { data, error })

    if (error) {
      setError(`Failed: ${error.message}`)
      console.error('Full error:', error)
      setLoading(false)
    } else if (data.user) {
      setSuccess(true)
      setError(null)
      console.log('Success! User created:', data.user)
      
      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Test User Generator</h1>
          <p className="text-zinc-400">
            Creates a test user automatically to bypass email validation issues
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm">
            <p className="text-zinc-300 mb-2">
              This will create a user with a unique email and log you in automatically.
            </p>
            <p className="text-zinc-500 text-xs">
              Email format: user[timestamp]@example.com
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
              {error}
              <div className="mt-3 pt-3 border-t border-red-900">
                <p className="font-semibold mb-2">Troubleshooting:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to Supabase Dashboard → Authentication → Providers</li>
                  <li>Enable "Email" provider</li>
                  <li>Check "Enable email signup"</li>
                  <li>Uncheck "Confirm email"</li>
                  <li>Go to URL Configuration and set Site URL to: http://localhost:3000</li>
                </ol>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-950/50 border border-green-900 rounded-lg text-green-400 text-sm">
              ✓ Account created successfully! Redirecting...
            </div>
          )}

          <button
            onClick={createTestUser}
            disabled={loading || success}
            className="w-full py-4 bg-white text-black font-medium text-lg rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : success ? 'Success!' : 'Create Test Account'}
          </button>

          <div className="text-center">
            <a
              href="/auth/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to normal login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

