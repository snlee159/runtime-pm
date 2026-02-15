'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { OnboardingFormData } from '@/lib/types'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState<OnboardingFormData>({
    full_name: '',
    role: '',
    work_style: '',
    typical_work_hours: 8,
    primary_goals: '',
    secondary_goals: '',
    preferred_task_duration: 60,
    deep_work_preference: 'morning',
    multitasking_comfort: 'moderate',
    break_frequency: 'hourly',
    peak_energy_time: 'morning',
    low_energy_time: 'afternoon',
    context_switch_tolerance: 'moderate',
    planning_style: 'balanced',
    overcommitment_tendency: 'moderate',
    current_challenges: '',
    tools_used: '',
    team_size: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      // Check if user already has a profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile?.onboarding_completed) {
        router.push('/dashboard')
      }
    }
    checkUser()
  }, [supabase, router])

  const updateFormData = (field: keyof OnboardingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    setError(null)
    if (step === 1 && !formData.full_name) {
      setError('Please enter your name')
      return
    }
    if (step === 2 && (!formData.role || !formData.work_style)) {
      setError('Please complete all fields')
      return
    }
    if (step === 3 && !formData.primary_goals) {
      setError('Please share your primary goals')
      return
    }
    setStep(step + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!userId) {
        throw new Error('No user found')
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          ...formData,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to complete onboarding')
      setLoading(false)
    }
  }

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Runtime PM</h1>
          <p className="text-zinc-400">Let's personalize your experience</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm text-zinc-400">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">What should we call you?</h2>
                <p className="text-zinc-400 mb-6">Let's start with the basics</p>
              </div>
              
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => updateFormData('full_name', e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Professional Context */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Tell us about your work</h2>
                <p className="text-zinc-400 mb-6">This helps us understand your context</p>
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-zinc-300 mb-2">
                  What do you do?
                </label>
                <input
                  id="role"
                  type="text"
                  value={formData.role}
                  onChange={(e) => updateFormData('role', e.target.value)}
                  placeholder="e.g., Software Engineer, Designer, Product Manager"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="work_style" className="block text-sm font-medium text-zinc-300 mb-2">
                  How would you describe your work style?
                </label>
                <input
                  id="work_style"
                  type="text"
                  value={formData.work_style}
                  onChange={(e) => updateFormData('work_style', e.target.value)}
                  placeholder="e.g., Morning person, Night owl, Flexible"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="typical_work_hours" className="block text-sm font-medium text-zinc-300 mb-2">
                  Typical work hours per day
                </label>
                <input
                  id="typical_work_hours"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={formData.typical_work_hours || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    updateFormData('typical_work_hours', isNaN(value) ? 8 : value)
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="team_size" className="block text-sm font-medium text-zinc-300 mb-2">
                  Team size (optional)
                </label>
                <select
                  id="team_size"
                  value={formData.team_size}
                  onChange={(e) => updateFormData('team_size', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="">Select...</option>
                  <option value="solo">Working solo</option>
                  <option value="small">Small team (2-5)</option>
                  <option value="medium">Medium team (6-15)</option>
                  <option value="large">Large team (16+)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">What are your goals?</h2>
                <p className="text-zinc-400 mb-6">This helps us prioritize your planning</p>
              </div>
              
              <div>
                <label htmlFor="primary_goals" className="block text-sm font-medium text-zinc-300 mb-2">
                  Primary Goals *
                </label>
                <textarea
                  id="primary_goals"
                  value={formData.primary_goals}
                  onChange={(e) => updateFormData('primary_goals', e.target.value)}
                  placeholder="What are the main things you want to achieve? Be specific..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="secondary_goals" className="block text-sm font-medium text-zinc-300 mb-2">
                  Secondary Goals (optional)
                </label>
                <textarea
                  id="secondary_goals"
                  value={formData.secondary_goals}
                  onChange={(e) => updateFormData('secondary_goals', e.target.value)}
                  placeholder="Any other objectives you're working towards..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="current_challenges" className="block text-sm font-medium text-zinc-300 mb-2">
                  Current Challenges (optional)
                </label>
                <textarea
                  id="current_challenges"
                  value={formData.current_challenges}
                  onChange={(e) => updateFormData('current_challenges', e.target.value)}
                  placeholder="What obstacles or challenges are you facing?"
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Step 4: Work Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Your work preferences</h2>
                <p className="text-zinc-400 mb-6">Help us optimize your daily plans</p>
              </div>

              <div>
                <label htmlFor="peak_energy_time" className="block text-sm font-medium text-zinc-300 mb-2">
                  When is your peak energy time?
                </label>
                <select
                  id="peak_energy_time"
                  value={formData.peak_energy_time}
                  onChange={(e) => updateFormData('peak_energy_time', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              <div>
                <label htmlFor="low_energy_time" className="block text-sm font-medium text-zinc-300 mb-2">
                  When is your low energy time?
                </label>
                <select
                  id="low_energy_time"
                  value={formData.low_energy_time}
                  onChange={(e) => updateFormData('low_energy_time', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              <div>
                <label htmlFor="deep_work_preference" className="block text-sm font-medium text-zinc-300 mb-2">
                  When do you prefer deep work?
                </label>
                <select
                  id="deep_work_preference"
                  value={formData.deep_work_preference}
                  onChange={(e) => updateFormData('deep_work_preference', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              <div>
                <label htmlFor="preferred_task_duration" className="block text-sm font-medium text-zinc-300 mb-2">
                  Preferred task duration (minutes)
                </label>
                <select
                  id="preferred_task_duration"
                  value={formData.preferred_task_duration || 60}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    updateFormData('preferred_task_duration', isNaN(value) ? 60 : value)
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="25">25 minutes (Pomodoro)</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="break_frequency" className="block text-sm font-medium text-zinc-300 mb-2">
                  How often do you take breaks?
                </label>
                <select
                  id="break_frequency"
                  value={formData.break_frequency}
                  onChange={(e) => updateFormData('break_frequency', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="rarely">Rarely</option>
                  <option value="hourly">Every hour or so</option>
                  <option value="frequent">Frequently</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 5: Planning Style */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">Your planning style</h2>
                <p className="text-zinc-400 mb-6">Final touches to personalize your experience</p>
              </div>

              <div>
                <label htmlFor="planning_style" className="block text-sm font-medium text-zinc-300 mb-2">
                  Planning approach
                </label>
                <select
                  id="planning_style"
                  value={formData.planning_style}
                  onChange={(e) => updateFormData('planning_style', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="aggressive">Aggressive - Pack as much as possible</option>
                  <option value="balanced">Balanced - Realistic planning</option>
                  <option value="conservative">Conservative - Leave buffer time</option>
                </select>
              </div>

              <div>
                <label htmlFor="overcommitment_tendency" className="block text-sm font-medium text-zinc-300 mb-2">
                  How often do you overcommit?
                </label>
                <select
                  id="overcommitment_tendency"
                  value={formData.overcommitment_tendency}
                  onChange={(e) => updateFormData('overcommitment_tendency', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="low">Rarely overcommit</option>
                  <option value="moderate">Sometimes overcommit</option>
                  <option value="high">Often overcommit</option>
                </select>
                <p className="mt-2 text-sm text-zinc-500">
                  We'll help you balance your commitments based on this
                </p>
              </div>

              <div>
                <label htmlFor="multitasking_comfort" className="block text-sm font-medium text-zinc-300 mb-2">
                  Comfort with multitasking
                </label>
                <select
                  id="multitasking_comfort"
                  value={formData.multitasking_comfort}
                  onChange={(e) => updateFormData('multitasking_comfort', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="low">Low - Prefer single focus</option>
                  <option value="moderate">Moderate - Can handle some</option>
                  <option value="high">High - Comfortable multitasking</option>
                </select>
              </div>

              <div>
                <label htmlFor="context_switch_tolerance" className="block text-sm font-medium text-zinc-300 mb-2">
                  Tolerance for context switching
                </label>
                <select
                  id="context_switch_tolerance"
                  value={formData.context_switch_tolerance}
                  onChange={(e) => updateFormData('context_switch_tolerance', e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="low">Low - Minimize switches</option>
                  <option value="moderate">Moderate - Some switching OK</option>
                  <option value="high">High - Switching doesn't bother me</option>
                </select>
              </div>

              <div>
                <label htmlFor="tools_used" className="block text-sm font-medium text-zinc-300 mb-2">
                  Tools & technologies you use (optional)
                </label>
                <input
                  id="tools_used"
                  type="text"
                  value={formData.tools_used}
                  onChange={(e) => updateFormData('tools_used', e.target.value)}
                  placeholder="e.g., React, Python, Figma, etc."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex-1 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
            )}
            
            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

