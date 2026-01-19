'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const validatePassword = () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validatePassword()) {
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/onboarding`,
      }
    })

    if (signUpError) {
      console.error('SignUp Error:', signUpError)
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Navigate to onboarding
      router.push('/auth/onboarding')
    } else {
      setError('Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Image 
              src="/favicon-light.svg" 
              alt="Runtime PM Logo" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
          </div>
          <p className="text-zinc-400">Sign up for Runtime PM</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-zinc-500">Must be at least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
              minLength={6}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 text-xs text-green-400">Passwords match ✓</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword}
            className="w-full py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating Account...' : 'Continue to Onboarding'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}




