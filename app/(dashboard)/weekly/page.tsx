import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { calculateWeeklySummary } from '@/lib/planning-engine'
import { getLocalWeekBounds } from '@/lib/date-utils'

export default async function WeeklyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { start, end } = getLocalWeekBounds()

  // Get this week's plans
  const { data: plans } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)

  // Get this week's wraps
  const { data: wraps } = await supabase
    .from('daily_wraps')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)

  // Get tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)

  // Calculate summary
  const summary = calculateWeeklySummary(
    plans || [],
    wraps || [],
    tasks || []
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Weekly Review</h1>
        <p className="text-zinc-400">
          {new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' - '}
          {new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-3xl font-bold mb-2">{summary.total_tasks_completed}</div>
          <div className="text-sm text-zinc-400">Tasks Completed</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-3xl font-bold mb-2">{summary.total_tasks_dropped}</div>
          <div className="text-sm text-zinc-400">Tasks Dropped</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="text-3xl font-bold mb-2">{summary.avg_context_switches.toFixed(1)}</div>
          <div className="text-sm text-zinc-400">Avg Context Switches</div>
        </div>
      </div>

      {/* Pace Assessment */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-3">Pace Assessment</h2>
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            summary.pace_assessment === 'balanced' 
              ? 'bg-green-900 text-green-300'
              : summary.pace_assessment === 'over_scoping'
              ? 'bg-red-900 text-red-300'
              : 'bg-blue-900 text-blue-300'
          }`}>
            {summary.pace_assessment.replace('_', ' ')}
          </span>
        </div>
        <p className="text-zinc-300">{summary.insights}</p>
      </div>

      {/* Daily Breakdown */}
      {wraps && wraps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Daily Breakdown</h2>
          <div className="space-y-3">
            {wraps.map((wrap) => (
              <div key={wrap.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {new Date(wrap.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {wrap.tasks_completed?.length || 0} completed, 
                    {' '}{wrap.tasks_dropped?.length || 0} dropped
                  </div>
                </div>
                {wrap.what_went_well && (
                  <p className="text-sm text-zinc-400 mt-2">
                    ✓ {wrap.what_went_well}
                  </p>
                )}
                {wrap.what_broke && (
                  <p className="text-sm text-zinc-400 mt-1">
                    ✗ {wrap.what_broke}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(!wraps || wraps.length === 0) && (
        <div className="text-center py-12 text-zinc-500">
          No data yet for this week. Complete your first day to see insights.
        </div>
      )}
    </div>
  )
}

