'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testConnection = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getSession()
      setResult({ type: 'connection', data, error })
    } catch (err: any) {
      setResult({ type: 'connection', error: err.message })
    }
    setLoading(false)
  }

  const testSignUp = async () => {
    setLoading(true)
    try {
      const testEmail = `test${Date.now()}@example.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'test123456',
      })
      setResult({ type: 'signup', testEmail, data, error })
    } catch (err: any) {
      setResult({ type: 'signup', error: err.message })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Auth Test</h1>

        <div className="space-y-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <h2 className="font-semibold mb-2">Environment Variables</h2>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-zinc-400">SUPABASE_URL:</span>{' '}
                <span className="text-green-400">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">SUPABASE_KEY:</span>{' '}
                <span className="text-green-400">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
                    : 'NOT SET'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50"
            >
              Test Connection
            </button>
            <button
              onClick={testSignUp}
              disabled={loading}
              className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50"
            >
              Test Sign Up
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="font-semibold mb-4">Result:</h2>
            <pre className="text-xs overflow-auto bg-zinc-950 p-4 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-950/50 border border-yellow-900 rounded-lg">
          <h3 className="font-semibold mb-2">Common Issues:</h3>
          <ul className="text-sm space-y-2 text-yellow-200">
            <li>• Email provider not enabled in Supabase Dashboard → Authentication → Providers</li>
            <li>• "Confirm email" should be OFF for development</li>
            <li>• Make sure you're using the correct anon key (starts with "eyJ")</li>
            <li>• Check if signups are allowed in your Supabase project</li>
          </ul>
        </div>

        <div className="mt-4">
          <a
            href="/auth/login"
            className="text-zinc-400 hover:text-white text-sm"
          >
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}

