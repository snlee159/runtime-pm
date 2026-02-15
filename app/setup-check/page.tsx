'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SetupCheckPage() {
  const [checks, setChecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    runChecks()
  }, [])

  const runChecks = async () => {
    const results: any[] = []

    // Check 1: Environment variables
    results.push({
      name: 'Environment Variables',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'pass' : 'fail',
      message: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? 'Supabase credentials configured' 
        : 'Missing Supabase credentials in .env.local'
    })

    // Check 2: Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    results.push({
      name: 'Authentication',
      status: user ? 'pass' : 'fail',
      message: user ? `Logged in as ${user.email}` : 'Not logged in'
    })

    // Check 3: Projects table
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    results.push({
      name: 'Projects Table',
      status: !projectsError ? 'pass' : 'fail',
      message: !projectsError 
        ? 'Projects table exists' 
        : `Error: ${projectsError.message || 'Table does not exist'}`
    })

    // Check 4: Tasks table
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1)
    
    results.push({
      name: 'Tasks Table',
      status: !tasksError ? 'pass' : 'fail',
      message: !tasksError 
        ? 'Tasks table exists' 
        : `Error: ${tasksError.message || 'Table does not exist'}`
    })

    // Check 5: Daily check-ins table
    const { data: checkins, error: checkinsError } = await supabase
      .from('daily_checkins')
      .select('id')
      .limit(1)
    
    results.push({
      name: 'Daily Check-ins Table',
      status: !checkinsError ? 'pass' : 'fail',
      message: !checkinsError 
        ? 'Daily check-ins table exists' 
        : `Error: ${checkinsError.message || 'Table does not exist'}`
    })

    // Check 6: Daily plans table
    const { data: plans, error: plansError } = await supabase
      .from('daily_plans')
      .select('id')
      .limit(1)
    
    results.push({
      name: 'Daily Plans Table',
      status: !plansError ? 'pass' : 'fail',
      message: !plansError 
        ? 'Daily plans table exists' 
        : `Error: ${plansError.message || 'Table does not exist'}`
    })

    setChecks(results)
    setLoading(false)
  }

  const allPassed = checks.every(c => c.status === 'pass')
  const anyFailed = checks.some(c => c.status === 'fail')

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Setup Check</h1>
        <p className="text-zinc-400 mb-8">Verifying your Runtime PM configuration</p>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-4 text-zinc-400">Running checks...</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-8">
              {checks.map((check, i) => (
                <div 
                  key={i}
                  className={`p-4 rounded-lg border ${
                    check.status === 'pass' 
                      ? 'bg-green-950/30 border-green-900' 
                      : 'bg-red-950/30 border-red-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{check.name}</h3>
                    <span className={`text-sm font-medium ${
                      check.status === 'pass' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {check.status === 'pass' ? '✓ PASS' : '✗ FAIL'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{check.message}</p>
                </div>
              ))}
            </div>

            {allPassed && (
              <div className="p-6 bg-green-950/30 border border-green-900 rounded-lg mb-8">
                <h2 className="text-xl font-bold text-green-400 mb-2">
                  ✓ All checks passed!
                </h2>
                <p className="text-zinc-300 mb-4">
                  Your Runtime PM installation is configured correctly.
                </p>
                <a
                  href="/dashboard"
                  className="inline-block px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Go to App →
                </a>
              </div>
            )}

            {anyFailed && (
              <div className="p-6 bg-red-950/30 border border-red-900 rounded-lg">
                <h2 className="text-xl font-bold text-red-400 mb-3">
                  Setup Required
                </h2>
                <div className="space-y-3 text-sm text-zinc-300">
                  <p className="font-semibold">To fix the issues above:</p>
                  
                  {checks.some(c => c.name.includes('Table') && c.status === 'fail') && (
                    <div className="p-3 bg-zinc-900 rounded">
                      <p className="font-medium mb-2">Run the database schema:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Go to your Supabase dashboard</li>
                        <li>Click "SQL Editor" in the left sidebar</li>
                        <li>Click "New query"</li>
                        <li>Open <code className="bg-zinc-800 px-1 py-0.5 rounded">supabase-schema.sql</code> from this project</li>
                        <li>Copy all contents and paste into Supabase</li>
                        <li>Click "Run" or press Cmd/Ctrl + Enter</li>
                        <li>Refresh this page</li>
                      </ol>
                    </div>
                  )}

                  {checks.some(c => c.name === 'Authentication' && c.status === 'fail') && (
                    <div className="p-3 bg-zinc-900 rounded">
                      <p className="font-medium mb-2">You need to log in:</p>
                      <a 
                        href="/auth/test-login"
                        className="inline-block px-4 py-2 bg-white text-black rounded hover:bg-zinc-200 transition-colors"
                      >
                        Create Test Account
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={runChecks}
                className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                ↻ Re-run Checks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

