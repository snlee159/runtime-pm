'use client'

import { useState } from 'react'

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EnergyLevel } from '@/lib/types'
import { getLocalDateString } from '@/lib/date-utils'

export default function CheckInPage() {
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium')
  const [availableHours, setAvailableHours] = useState('4')
  const [constraints, setConstraints] = useState('')
  const [priorities, setPriorities] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log('📝 Form submitted')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No user found')
      return
    }
    console.log('✅ User found:', user.id)

    const today = getLocalDateString()
    console.log('📅 Date:', today)

    // Save check-in
    console.log('💾 Saving check-in...')
    const { error: checkInError } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: user.id,
        date: today,
        energy_level: energyLevel,
        available_hours: parseFloat(availableHours),
        constraints: constraints || null,
        priorities: priorities || null,
      }, {
        onConflict: 'user_id,date'
      })

    console.log('💾 Check-in save result:', checkInError ? 'ERROR' : 'SUCCESS')

    if (checkInError) {
      console.error('Error saving check-in:', checkInError)
      console.error('Error details:', JSON.stringify(checkInError, null, 2))
      
      // More specific error messages
      let errorMessage = 'Failed to save check-in. '
      if (checkInError.message?.includes('priorities')) {
        errorMessage += 'Please run the database migration: supabase-migration-all-recent.sql'
      } else if (checkInError.message?.includes('constraint')) {
        errorMessage += 'Database constraint issue. Check that the schema is properly set up.'
      } else {
        errorMessage += `Error: ${checkInError.message || 'Unknown error'}`
      }
      
      setError(errorMessage)
      setLoading(false)
      return
    }

    // Success! Redirect to interactive plan editor
    console.log('✅ Check-in saved successfully, redirecting to plan editor')
    
    router.push(`/plan-editor?date=${today}`)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Morning Reality Check</h1>
        <p className="text-zinc-400">Quick 60-second check-in. No goal-setting, just reality.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Energy Level */}
        <div>
          <label className="block text-lg font-medium mb-4">
            How's your energy today?
          </label>
          <div className="grid grid-cols-5 gap-3">
            {(['very_low', 'low', 'medium', 'high', 'very_high'] as EnergyLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setEnergyLevel(level)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  energyLevel === level
                    ? 'border-white bg-white text-black'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">
                    {level === 'very_low' && '😴'}
                    {level === 'low' && '😑'}
                    {level === 'medium' && '😐'}
                    {level === 'high' && '😊'}
                    {level === 'very_high' && '🚀'}
                  </div>
                  <div className="text-xs font-medium">
                    {level.replace('_', ' ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Available Hours */}
        <div>
          <label htmlFor="hours" className="block text-lg font-medium mb-4">
            How many focused hours do you have today?
          </label>
          <div className="flex items-center gap-4">
            <input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              max="16"
              value={availableHours}
              onChange={(e) => setAvailableHours(e.target.value)}
              className="w-32 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-zinc-700"
              required
            />
            <span className="text-zinc-400">hours</span>
          </div>
        </div>

        {/* Priorities */}
        <div>
          <label htmlFor="priorities" className="block text-lg font-medium mb-4">
            What are you excited to work on today? (optional)
          </label>
          <textarea
            id="priorities"
            value={priorities}
            onChange={(e) => setPriorities(e.target.value)}
            placeholder="e.g., Really want to finish the user dashboard, excited about the payment integration, need to focus on design work..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[100px]"
          />
          <p className="text-xs text-zinc-500 mt-2">
            Mention specific projects, tasks, or types of work you want to prioritize
          </p>
        </div>

        {/* Constraints */}
        <div>
          <label htmlFor="constraints" className="block text-lg font-medium mb-4">
            Any constraints today? (optional)
          </label>
          <textarea
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="e.g., afternoon meetings, need to leave early, feeling distracted..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[100px]"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-medium text-lg rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving check-in...' : 'Continue to Plan Builder'}
          </button>
        </div>
      </form>
    </div>
  )
}

