import { createClient } from '@/lib/supabase/server'
import { generateDailyPlan } from '@/lib/planning-engine'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('========================================')
  console.log('📅 PLAN GENERATION STARTED')
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

  // Get user profile for personalized planning
  console.log('🔍 Fetching user profile...')
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (userProfile) {
    console.log('✅ User profile loaded:', {
      name: userProfile.full_name,
      role: userProfile.role,
      planningStyle: userProfile.planning_style
    })
  } else {
    console.log('⚠️  No user profile found - using defaults')
  }

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

  // Generate plan using planning engine
  console.log('🧠 Generating plan...')
  let plan
  try {
    plan = generateDailyPlan({
      tasks: tasksWithDependencies,
      checkIn,
      userProfile: userProfile || undefined,
    })
    console.log('✅ Plan generated successfully')
    console.log('📊 Plan details:', {
      primary: plan.primary_focus_task_id ? 'Yes' : 'No',
      secondary: plan.secondary_task_ids.length,
      multitask: plan.multitask_task_ids.length,
      totalEffort: plan.estimated_total_effort,
      contextSwitches: plan.context_switches
    })
  } catch (planError) {
    console.error('❌ Plan generation failed:', planError)
    return NextResponse.json({ error: 'Plan generation failed', details: String(planError) }, { status: 500 })
  }

  // Save plan
  console.log('💾 Saving plan to database...')
  const { data: savedPlan, error: planError } = await supabase
    .from('daily_plans')
    .upsert({
      user_id: user.id,
      date,
      checkin_id: checkIn.id,
      primary_focus_task_id: plan.primary_focus_task_id,
      secondary_task_ids: plan.secondary_task_ids,
      multitask_task_ids: plan.multitask_task_ids,
      reasoning: plan.reasoning,
      estimated_total_effort: plan.estimated_total_effort,
      context_switches: plan.context_switches,
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()

  if (planError) {
    console.error('❌ Failed to save plan:', planError)
    return NextResponse.json({ error: 'Failed to save plan', details: planError }, { status: 500 })
  }

  console.log('✅ Plan saved successfully:', savedPlan?.id)

  console.log('========================================')
  console.log('🎉 PLAN GENERATION COMPLETE (Suggestion Only)')
  console.log('========================================')

  return NextResponse.json({ plan: savedPlan })
}

