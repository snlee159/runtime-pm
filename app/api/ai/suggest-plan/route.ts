import { createClient } from '@/lib/supabase/server'
import { generateDailyPlan } from '@/lib/planning-engine'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('========================================')
  console.log('💡 PLAN SUGGESTION (NO SAVE)')
  console.log('========================================')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('❌ No user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('✅ User authenticated:', user.id)

  const { date } = await request.json()
  console.log('📆 Date:', date)

  // Get check-in for the date
  console.log('🔍 Fetching check-in...')
  const { data: checkIn, error: checkInError } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .single()

  if (checkInError || !checkIn) {
    console.error('❌ Check-in not found:', checkInError)
    return NextResponse.json({ error: 'Check-in not found', details: checkInError }, { status: 404 })
  }

  console.log('✅ Check-in found:', {
    energy: checkIn.energy_level,
    hours: checkIn.available_hours,
    priorities: checkIn.priorities ? 'Yes' : 'No',
    constraints: checkIn.constraints ? 'Yes' : 'No'
  })

  // Get all tasks (incomplete and complete) with dependencies
  console.log('🔍 Fetching tasks...')
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['incomplete', 'complete'])

  if (tasksError) {
    console.error('❌ Failed to fetch tasks:', tasksError)
    return NextResponse.json({ error: 'Failed to fetch tasks', details: tasksError }, { status: 500 })
  }

  // Fetch task dependencies for all tasks
  console.log('🔍 Fetching task dependencies...')
  const taskIds = tasks?.map(t => t.id) || []
  const { data: dependencies, error: depsError } = await supabase
    .from('task_dependencies')
    .select('*')
    .in('task_id', taskIds)

  if (depsError) {
    console.error('❌ Failed to fetch dependencies:', depsError)
  }

  // Attach dependencies to tasks
  const tasksWithDependencies = tasks?.map(task => ({
    ...task,
    dependencies: dependencies?.filter(dep => dep.task_id === task.id) || []
  })) || []

  console.log('✅ Tasks with dependencies loaded:', tasksWithDependencies.length)

  const incompleteTasks = tasksWithDependencies.filter(t => t.status === 'incomplete')
  console.log('✅ Incomplete tasks:', incompleteTasks.length, 'of', tasksWithDependencies.length, 'total')
  if (incompleteTasks.length > 0) {
    console.log('📋 Task details:')
    incompleteTasks.forEach((task, i) => {
      const depCount = task.dependencies?.length || 0
      console.log(`   ${i + 1}. "${task.title}" - ${task.estimated_effort}m, ${task.energy_cost} energy, ${task.focus_depth} focus${depCount > 0 ? ` (${depCount} deps)` : ''}`)
    })
  } else {
    console.log('⚠️  NO TASKS AVAILABLE FOR PLANNING')
  }

  // Generate plan suggestion using planning engine
  console.log('🧠 Generating plan suggestion...')
  let planSuggestion
  try {
    planSuggestion = generateDailyPlan({
      tasks: tasksWithDependencies,
      checkIn,
    })
    console.log('✅ Plan suggestion generated successfully')
    console.log('📊 Suggestion details:', {
      primary: planSuggestion.primary_focus_task_id ? 'Yes' : 'No',
      secondary: planSuggestion.secondary_task_ids.length,
      multitask: planSuggestion.multitask_task_ids.length,
      totalEffort: planSuggestion.estimated_total_effort,
      contextSwitches: planSuggestion.context_switches
    })
  } catch (planError) {
    console.error('❌ Plan suggestion failed:', planError)
    return NextResponse.json({ error: 'Plan suggestion failed', details: String(planError) }, { status: 500 })
  }

  console.log('========================================')
  console.log('💡 SUGGESTION COMPLETE (NOT SAVED)')
  console.log('========================================')

  return NextResponse.json({ suggestion: planSuggestion })
}

