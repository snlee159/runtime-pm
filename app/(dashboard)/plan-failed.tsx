'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getLocalDateString } from '@/lib/date-utils'

export function PlanFailed() {
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRetry = async () => {
    setRetrying(true)
    setError(null)
    console.log('🔄 Retrying plan generation...')

    const today = getLocalDateString()
    
    try {
      console.log('📞 Calling /api/generate-plan with date:', today)
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Plan generated!', data)
        // Refresh the page to show the plan
        window.location.reload()
      } else {
        const errorData = await response.json()
        console.error('❌ Plan generation failed:', errorData)
        setError(errorData.error || 'Failed to generate plan')
        setRetrying(false)
      }
    } catch (err) {
      console.error('❌ Network error:', err)
      setError('Network error. Check your connection.')
      setRetrying(false)
    }
  }

  const today = getLocalDateString()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">No Plan Yet</h1>
        <p className="text-zinc-400">Your check-in was saved but you haven't finalized your plan</p>
      </div>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
        <p className="text-zinc-300">
          You completed your morning check-in but didn't finalize your daily plan.
        </p>
        <p className="text-zinc-400">
          This could mean:
        </p>
        <ul className="list-disc list-inside space-y-2 text-zinc-400">
          <li>You cancelled during planning</li>
          <li>No tasks available to plan (create some tasks first)</li>
          <li>Technical issue during plan generation</li>
        </ul>

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400">
            {error}
          </div>
        )}
        
        <div className="pt-4 flex gap-3">
          <Link
            href={`/plan-editor?date=${today}`}
            className="flex-1 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors text-center"
          >
            Build Your Plan
          </Link>
          <Link
            href="/tasks"
            className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Manage Tasks
          </Link>
        </div>
      </div>
    </div>
  )
}

