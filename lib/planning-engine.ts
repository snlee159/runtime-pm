import { Task, DailyCheckIn, DailyPlan, EnergyLevel, EnergyCost } from './types'

/**
 * Core Planning Engine
 * 
 * This is the brain of Runtime PM. It translates reality constraints into execution decisions.
 * 
 * Philosophy:
 * - Start from constraints, not goals
 * - Limit to one primary execution thread per day
 * - Penalize context switching
 * - Match task energy cost to available energy
 * - Explicitly decide what NOT to do
 * 
 * TODO: This is a simple rule-based implementation.
 * Future: Layer in learned preferences, historical performance, adaptive planning
 */

interface PlanningInput {
  tasks: Task[]
  checkIn: DailyCheckIn
}

interface PlanningOutput {
  primary_focus_task_id?: string
  secondary_task_ids: string[]
  multitask_task_ids: string[]
  reasoning: string
  estimated_total_effort: number
  context_switches: number
}

// Energy level to numeric score mapping
const ENERGY_SCORES: Record<EnergyLevel, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
}

const ENERGY_COST_SCORES: Record<EnergyCost, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

/**
 * Filter tasks to only include those whose dependencies are completed
 * 
 * A task can only be planned if all tasks it depends on are completed.
 */
function filterTasksByDependencies(tasks: Task[]): Task[] {
  const completedTaskIds = new Set(
    tasks.filter(t => t.status === 'completed').map(t => t.id)
  )
  
  return tasks.filter(task => {
    // If task has no dependencies, it's always available
    if (!task.dependencies || task.dependencies.length === 0) {
      return true
    }
    
    // Check if all dependencies are completed
    const allDependenciesCompleted = task.dependencies.every(dep => 
      completedTaskIds.has(dep.depends_on_task_id)
    )
    
    if (!allDependenciesCompleted) {
      console.log(`   ⏸️  Task "${task.title}" blocked by incomplete dependencies`)
    }
    
    return allDependenciesCompleted
  })
}

/**
 * Main planning function
 */
export function generateDailyPlan(input: PlanningInput): PlanningOutput {
  console.log('🎯 Planning Engine: Starting')
  const { tasks, checkIn } = input
  const availableMinutes = checkIn.available_hours * 60
  const energyScore = ENERGY_SCORES[checkIn.energy_level]
  const userPriorities = checkIn.priorities?.toLowerCase() || ''
  
  console.log('   Available time:', availableMinutes, 'minutes')
  console.log('   Energy score:', energyScore)
  console.log('   User priorities:', userPriorities ? 'Yes' : 'No')
  console.log('   Total tasks to consider:', tasks.length)

  // Filter out tasks whose dependencies are not yet completed
  console.log('   Filtering for tasks with completed dependencies...')
  const tasksWithMetDependencies = filterTasksByDependencies(tasks)
  console.log('   Tasks with met dependencies:', tasksWithMetDependencies.length)

  // Get LEAF tasks only (atomic tasks with no children)
  // These are the actual executable work units
  console.log('   Filtering for leaf tasks (no children)...')
  const allReadyTasks = tasksWithMetDependencies.filter(t => t.status === 'ready')
  
  // Find which tasks have children
  const taskIdsWithChildren = new Set(
    allReadyTasks
      .filter(t => t.parent_task_id)
      .map(t => t.parent_task_id)
  )
  
  // Leaf tasks = ready tasks with no children
  const leafTasks = allReadyTasks.filter(t => !taskIdsWithChildren.has(t.id))
  
  console.log('   Ready tasks found:', allReadyTasks.length)
  console.log('   Parent tasks (have children):', taskIdsWithChildren.size)
  console.log('   Leaf tasks (plannable):', leafTasks.length)

  if (leafTasks.length === 0) {
    console.log('   ⚠️  NO PLANNABLE TASKS: All tasks are either parents or have wrong status')
    return {
      secondary_task_ids: [],
      multitask_task_ids: [],
      reasoning: 'No tasks available for planning.',
      estimated_total_effort: 0,
      context_switches: 0,
    }
  }

  // Use leaf tasks directly (they already have correct effort estimates)
  const tasksWithRealEffort = leafTasks

  // Separate multitask-safe tasks
  const multitaskTasks = tasksWithRealEffort.filter(t => t.multitask_safe)
  const focusTasks = tasksWithRealEffort.filter(t => !t.multitask_safe)
  
  console.log('   Focus tasks:', focusTasks.length)
  console.log('   Multitask tasks:', multitaskTasks.length)

  // Find primary focus task (considering user priorities)
  console.log('   Selecting primary focus task...')
  const primaryTask = selectPrimaryFocus(focusTasks, energyScore, userPriorities)
  
  if (primaryTask) {
    console.log('   ✅ Primary task selected:', primaryTask.title)
  } else {
    console.log('   ⚠️  No primary task selected')
  }

  // Calculate remaining capacity
  let remainingMinutes = availableMinutes
  let remainingEnergy = energyScore
  const selectedSecondaryIds: string[] = []
  let contextSwitches = 0

  if (primaryTask) {
    remainingMinutes -= primaryTask.estimated_effort
    remainingEnergy -= ENERGY_COST_SCORES[primaryTask.energy_cost] * 0.5 // Primary task takes more energy
    contextSwitches = 0 // Primary task is the main thread
  }

  // Select secondary tasks (limited to avoid context switching)
  const secondaryTasks = selectSecondaryTasks(
    focusTasks.filter(t => t.id !== primaryTask?.id),
    remainingMinutes,
    remainingEnergy,
    energyScore,
    userPriorities
  )

  selectedSecondaryIds.push(...secondaryTasks.map(t => t.id))
  contextSwitches += Math.max(0, secondaryTasks.length - 1) // Each additional task is a context switch

  // Calculate used time
  const usedTime = (primaryTask?.estimated_effort || 0) + 
    secondaryTasks.reduce((sum, t) => sum + t.estimated_effort, 0)

  // Select multitask tasks (can be done alongside)
  const multitaskIds = multitaskTasks
    .filter(t => ENERGY_COST_SCORES[t.energy_cost] <= 1) // Only low-energy multitask tasks
    .slice(0, 3) // Limit to 3
    .map(t => t.id)

  // Generate reasoning
  const reasoning = generateReasoning({
    primaryTask,
    secondaryCount: selectedSecondaryIds.length,
    multitaskCount: multitaskIds.length,
    energyLevel: checkIn.energy_level,
    availableHours: checkIn.available_hours,
    usedMinutes: usedTime,
    contextSwitches,
    priorities: checkIn.priorities,
  })

  return {
    primary_focus_task_id: primaryTask?.id,
    secondary_task_ids: selectedSecondaryIds,
    multitask_task_ids: multitaskIds,
    reasoning,
    estimated_total_effort: usedTime,
    context_switches: contextSwitches,
  }
}

/**
 * Select the primary focus task
 * 
 * Priority: Match energy cost to available energy, prefer deep work when energy is high, consider user priorities
 */
function selectPrimaryFocus(tasks: Task[], energyScore: number, userPriorities: string): Task | null {
  if (tasks.length === 0) return null

  // Score each task
  const scoredTasks = tasks.map(task => {
    let score = 0

    // Energy matching: prefer tasks that match our energy level
    const energyCost = ENERGY_COST_SCORES[task.energy_cost]
    const energyMatch = 5 - Math.abs(energyScore - energyCost)
    score += energyMatch * 3 // Weight energy matching heavily

    // Deep work bonus when energy is high
    if (task.focus_depth === 'deep' && energyScore >= 4) {
      score += 5
    }

    // Shallow work when energy is low
    if (task.focus_depth === 'shallow' && energyScore <= 2) {
      score += 3
    }

    // Prefer larger tasks as primary focus
    if (task.estimated_effort >= 60) {
      score += 2
    }

    // User priorities boost (biggest factor if mentioned)
    if (userPriorities && matchesUserPriorities(task, userPriorities)) {
      score += 15 // Strong preference for user-mentioned priorities
    }

    return { task, score }
  })

  // Sort by score and return top task
  scoredTasks.sort((a, b) => b.score - a.score)
  return scoredTasks[0].task
}

/**
 * Select secondary tasks
 * 
 * Fill remaining time without excessive context switching
 */
function selectSecondaryTasks(
  tasks: Task[],
  remainingMinutes: number,
  remainingEnergy: number,
  originalEnergy: number,
  userPriorities: string
): Task[] {
  const selected: Task[] = []
  let usedMinutes = 0

  // Limit secondary tasks to avoid context switching
  const maxSecondaryTasks = originalEnergy >= 4 ? 2 : 1

  // Score and sort tasks (prefer lower energy + user priorities)
  const sortedTasks = [...tasks]
    .map(task => {
      let score = 0
      const energyCost = ENERGY_COST_SCORES[task.energy_cost]
      score -= energyCost // Lower energy = higher score
      
      // Boost if matches user priorities
      if (userPriorities && matchesUserPriorities(task, userPriorities)) {
        score += 10
      }
      
      return { task, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.task)

  for (const task of sortedTasks) {
    if (selected.length >= maxSecondaryTasks) break
    if (usedMinutes + task.estimated_effort > remainingMinutes * 0.7) continue // Don't overfill
    if (ENERGY_COST_SCORES[task.energy_cost] > remainingEnergy) continue

    selected.push(task)
    usedMinutes += task.estimated_effort
    remainingEnergy -= ENERGY_COST_SCORES[task.energy_cost] * 0.3
  }

  return selected
}

/**
 * Check if a task matches user priorities
 */
function matchesUserPriorities(task: Task, priorities: string): boolean {
  const taskText = `${task.title} ${task.description || ''}`.toLowerCase()
  const projectText = task.project ? task.project.name.toLowerCase() : ''
  
  // Split priorities into keywords
  const keywords = priorities
    .split(/[,.\n]/)
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 3) // Ignore small words
  
  // Check if any keyword appears in task or project
  return keywords.some(keyword => 
    taskText.includes(keyword) || projectText.includes(keyword)
  )
}

/**
 * Generate human-readable reasoning for the plan
 */
function generateReasoning(params: {
  primaryTask: Task | null
  secondaryCount: number
  multitaskCount: number
  energyLevel: EnergyLevel
  availableHours: number
  usedMinutes: number
  contextSwitches: number
  priorities?: string | null
}): string {
  const { primaryTask, secondaryCount, multitaskCount, energyLevel, availableHours, usedMinutes, contextSwitches, priorities } = params

  const parts: string[] = []

  // User priorities acknowledgment
  if (priorities) {
    parts.push('Considering your priorities today.')
  }

  // Energy assessment
  if (energyLevel === 'high' || energyLevel === 'very_high') {
    parts.push('Your energy is high today.')
    if (primaryTask?.focus_depth === 'deep') {
      parts.push('Good day for deep work.')
    }
  } else if (energyLevel === 'low' || energyLevel === 'very_low') {
    parts.push('Your energy is low today.')
    parts.push('Focusing on lighter tasks.')
  } else {
    parts.push('Your energy is moderate.')
  }

  // Primary focus (show full context with parent)
  if (primaryTask) {
    parts.push(`Primary focus: ${primaryTask.title}.`)
  } else {
    parts.push('No primary focus task today.')
  }

  // Secondary tasks
  if (secondaryCount > 0) {
    parts.push(`${secondaryCount} secondary task${secondaryCount > 1 ? 's' : ''} for maintenance.`)
  }

  // Multitask tasks
  if (multitaskCount > 0) {
    parts.push(`${multitaskCount} low-effort task${multitaskCount > 1 ? 's' : ''} for downtime.`)
  }

  // Time allocation
  const usedHours = Math.round(usedMinutes / 60 * 10) / 10
  parts.push(`Planned: ${usedHours}h of ${availableHours}h available.`)

  // Context switching warning
  if (contextSwitches > 2) {
    parts.push('⚠️ Multiple context switches planned.')
  }

  return parts.join(' ')
}

/**
 * Calculate weekly summary metrics
 */
export function calculateWeeklySummary(
  plans: DailyPlan[],
  wraps: any[],
  tasks: Task[]
): {
  total_tasks_completed: number
  total_tasks_dropped: number
  avg_context_switches: number
  pace_assessment: 'over_scoping' | 'under_scoping' | 'balanced'
  insights: string
} {
  const totalCompleted = wraps.reduce((sum, w) => sum + (w.tasks_completed?.length || 0), 0)
  const totalDropped = wraps.reduce((sum, w) => sum + (w.tasks_dropped?.length || 0), 0)
  
  const avgContextSwitches = plans.length > 0
    ? plans.reduce((sum, p) => sum + p.context_switches, 0) / plans.length
    : 0

  // Assess pacing
  let paceAssessment: 'over_scoping' | 'under_scoping' | 'balanced' = 'balanced'
  const completionRate = totalCompleted / (totalCompleted + totalDropped || 1)
  
  if (completionRate < 0.6) {
    paceAssessment = 'over_scoping'
  } else if (completionRate > 0.9 && plans.length < 5) {
    paceAssessment = 'under_scoping'
  }

  // Generate insights
  const insights: string[] = []
  
  if (paceAssessment === 'over_scoping') {
    insights.push('You\'re planning too much. Consider reducing daily scope.')
  } else if (paceAssessment === 'under_scoping') {
    insights.push('You have more capacity. Consider taking on more.')
  }

  if (avgContextSwitches > 2) {
    insights.push('High context switching detected. Try focusing on fewer tasks per day.')
  }

  if (totalCompleted === 0 && wraps.length > 0) {
    insights.push('No tasks completed this week. Let\'s identify what\'s blocking progress.')
  }

  return {
    total_tasks_completed: totalCompleted,
    total_tasks_dropped: totalDropped,
    avg_context_switches: Math.round(avgContextSwitches * 10) / 10,
    pace_assessment: paceAssessment,
    insights: insights.join(' ') || 'Keep up the good work.',
  }
}

