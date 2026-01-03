'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Task, DailyPlan, DailyCheckIn, Project } from '@/lib/types'
import Link from 'next/link'

interface TaskWithProject extends Task {
  project?: Project
}

interface PlanState {
  primaryTaskId: string | null
  secondaryTaskIds: string[]
  multitaskTaskIds: string[]
}

export default function PlanEditorPage() {
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null)
  const [suggestedPlan, setSuggestedPlan] = useState<any>(null)
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([])
  const [allTasksFlat, setAllTasksFlat] = useState<TaskWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [planState, setPlanState] = useState<PlanState>({
    primaryTaskId: null,
    secondaryTaskIds: [],
    multitaskTaskIds: [],
  })
  const [reasoning, setReasoning] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [lockedTaskIds, setLockedTaskIds] = useState<string[]>([])
  const [existingPlan, setExistingPlan] = useState<any>(null)
  
  // AI Refinement
  const [aiInstruction, setAiInstruction] = useState('')
  const [refining, setRefining] = useState(false)
  const [refinementHistory, setRefinementHistory] = useState<string[]>([])
  
  // Search
  const [taskSearch, setTaskSearch] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadPlanningData()
  }, [date])

  // Warn user before leaving if plan not saved (create mode only)
  useEffect(() => {
    if (isEditMode || loading) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Chrome requires returnValue to be set
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditMode, loading])

  const loadPlanningData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load check-in
      const { data: checkInData, error: checkInError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

      if (checkInError || !checkInData) {
        setError('Check-in not found. Please complete your morning check-in first.')
        setLoading(false)
        return
      }
      setCheckIn(checkInData)

      // Load parent tasks (ready, scheduled, and completed) with dependencies and projects
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .eq('user_id', user.id)
        .is('parent_task_id', null)
        .in('status', ['ready', 'scheduled', 'completed'])
        .order('created_at', { ascending: false })

      let tasksWithSubtasks: TaskWithProject[] = []

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
      } else {
        // Load subtasks recursively
        const loadSubtasksRecursively = async (parentIds: string[]): Promise<any[]> => {
          if (parentIds.length === 0) return []
          
          const { data: subtasks } = await supabase
            .from('tasks')
            .select('*')
            .in('parent_task_id', parentIds)
            .in('status', ['ready', 'scheduled', 'completed'])
            .order('display_order', { ascending: true })
          
          if (!subtasks || subtasks.length === 0) return []
          
          // Load nested subtasks for these subtasks
          const nestedIds = subtasks.map(st => st.id)
          const nestedSubtasks = await loadSubtasksRecursively(nestedIds)
          
          // Attach nested subtasks to their parents
          return subtasks.map(st => ({
            ...st,
            subtasks: nestedSubtasks.filter(nst => nst.parent_task_id === st.id)
          }))
        }

        const taskIds = tasksData?.map(t => t.id) || []
        const allSubtasks = await loadSubtasksRecursively(taskIds)

        // Load dependencies for all tasks
        const { data: dependencies } = await supabase
          .from('task_dependencies')
          .select('*')
          .in('task_id', taskIds)

        tasksWithSubtasks = tasksData?.map(task => ({
          ...task,
          dependencies: dependencies?.filter(dep => dep.task_id === task.id) || [],
          subtasks: allSubtasks.filter(st => st.parent_task_id === task.id)
        })) || []

        setAllTasks(tasksWithSubtasks)
      }

      // Create a flattened array of all tasks (including nested subtasks) for easy lookup by ID
      const flattenTasks = (taskList: TaskWithProject[]): TaskWithProject[] => {
        const flat: TaskWithProject[] = []
        const flatten = (t: TaskWithProject) => {
          flat.push(t)
          if (t.subtasks && t.subtasks.length > 0) {
            t.subtasks.forEach(st => flatten(st as TaskWithProject))
          }
        }
        taskList.forEach(flatten)
        return flat
      }
      
      const flatTasks = flattenTasks(tasksWithSubtasks)
      setAllTasksFlat(flatTasks)

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('display_order', { ascending: true })

      setProjects(projectsData || [])

      // Check if plan already exists (edit mode)
      const { data: existingPlanData } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .single()

      if (existingPlanData) {
        // Edit mode - load existing plan
        setIsEditMode(true)
        setExistingPlan(existingPlanData)
        
        // Find which tasks are completed (locked)
        const allPlanTaskIds = [
          existingPlanData.primary_focus_task_id,
          ...(existingPlanData.secondary_task_ids || []),
          ...(existingPlanData.multitask_task_ids || [])
        ].filter(Boolean)
        
        const completedIds = flatTasks
          .filter(t => allPlanTaskIds.includes(t.id) && t.status === 'completed')
          .map(t => t.id)
        
        setLockedTaskIds(completedIds)
        
        // Initialize with existing plan
        setPlanState({
          primaryTaskId: existingPlanData.primary_focus_task_id || null,
          secondaryTaskIds: existingPlanData.secondary_task_ids || [],
          multitaskTaskIds: existingPlanData.multitask_task_ids || [],
        })
        setReasoning(existingPlanData.reasoning || '')
      } else {
        // Create mode - generate AI suggestion (don't save yet)
        const suggestionResponse = await fetch('/api/ai/suggest-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date }),
        })

        if (suggestionResponse.ok) {
          const { suggestion } = await suggestionResponse.json()
          setSuggestedPlan(suggestion)
          // Initialize plan state with AI suggestion
          setPlanState({
            primaryTaskId: suggestion.primary_focus_task_id || null,
            secondaryTaskIds: suggestion.secondary_task_ids || [],
            multitaskTaskIds: suggestion.multitask_task_ids || [],
          })
          setReasoning(suggestion.reasoning || '')
        }
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Failed to load planning data')
      setLoading(false)
    }
  }

  const calculateTotalTime = () => {
    const allSelectedIds = [
      planState.primaryTaskId,
      ...planState.secondaryTaskIds,
      ...planState.multitaskTaskIds,
    ].filter(Boolean) as string[]

    return allSelectedIds.reduce((total, taskId) => {
      const task = allTasksFlat.find(t => t.id === taskId)
      return total + (task?.estimated_effort || 0)
    }, 0)
  }

  const getAvailableMinutes = () => {
    return (checkIn?.available_hours || 0) * 60
  }

  const getTimePercentage = () => {
    const available = getAvailableMinutes()
    if (available === 0) return 0
    return Math.round((calculateTotalTime() / available) * 100)
  }

  const isTaskInPlan = (taskId: string) => {
    return planState.primaryTaskId === taskId ||
           planState.secondaryTaskIds.includes(taskId) ||
           planState.multitaskTaskIds.includes(taskId)
  }

  const isTaskLocked = (taskId: string) => {
    return lockedTaskIds.includes(taskId)
  }

  const addTaskToPlan = (taskId: string, category: 'primary' | 'secondary' | 'multitask') => {
    if (isTaskInPlan(taskId)) return

    if (category === 'primary') {
      setPlanState(prev => ({ ...prev, primaryTaskId: taskId }))
    } else if (category === 'secondary') {
      setPlanState(prev => ({ ...prev, secondaryTaskIds: [...prev.secondaryTaskIds, taskId] }))
    } else {
      setPlanState(prev => ({ ...prev, multitaskTaskIds: [...prev.multitaskTaskIds, taskId] }))
    }
  }

  const removeTaskFromPlan = (taskId: string) => {
    // Don't allow removing locked tasks
    if (isTaskLocked(taskId)) return
    
    setPlanState(prev => ({
      primaryTaskId: prev.primaryTaskId === taskId ? null : prev.primaryTaskId,
      secondaryTaskIds: prev.secondaryTaskIds.filter(id => id !== taskId),
      multitaskTaskIds: prev.multitaskTaskIds.filter(id => id !== taskId),
    }))
  }

  const moveTask = (taskId: string, from: string, to: 'primary' | 'secondary' | 'multitask') => {
    removeTaskFromPlan(taskId)
    addTaskToPlan(taskId, to)
  }

  const refineWithAI = async () => {
    if (!aiInstruction.trim()) return
    
    try {
      setRefining(true)
      setError(null)

      const response = await fetch('/api/ai/refine-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: aiInstruction,
          currentPlan: planState,
          availableTasks: allTasks,
          checkIn,
          lockedTaskIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refine plan')
      }

      const { refinedPlan } = await response.json()
      
      // Update plan state with AI refinement
      setPlanState({
        primaryTaskId: refinedPlan.primary_task_id || null,
        secondaryTaskIds: refinedPlan.secondary_task_ids || [],
        multitaskTaskIds: refinedPlan.multitask_task_ids || [],
      })
      
      // Update reasoning with changes
      const newReasoning = `${refinedPlan.reasoning}\n\n${refinedPlan.changes_summary ? '✨ ' + refinedPlan.changes_summary : ''}`
      setReasoning(newReasoning)
      
      // Add to history
      setRefinementHistory(prev => [...prev, `"${aiInstruction}" → ${refinedPlan.changes_summary || 'Updated'}`])
      
      // Clear instruction
      setAiInstruction('')
    } catch (err: any) {
      setError(err.message || 'Failed to refine plan with AI')
    } finally {
      setRefining(false)
    }
  }

  const savePlan = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const totalTime = calculateTotalTime()
      const allSelectedIds = [
        planState.primaryTaskId,
        ...planState.secondaryTaskIds,
        ...planState.multitaskTaskIds,
      ].filter(Boolean) as string[]

      // Save plan
      const { error: planError } = await supabase
        .from('daily_plans')
        .upsert({
          user_id: user.id,
          date,
          checkin_id: checkIn?.id,
          primary_focus_task_id: planState.primaryTaskId,
          secondary_task_ids: planState.secondaryTaskIds,
          multitask_task_ids: planState.multitaskTaskIds,
          reasoning: reasoning || 'Custom plan created by user',
          estimated_total_effort: totalTime,
          context_switches: planState.secondaryTaskIds.length,
        }, {
          onConflict: 'user_id,date'
        })

      if (planError) throw planError

      // Update task statuses - only for incomplete tasks
      const incompleteTaskIds = allSelectedIds.filter(id => !lockedTaskIds.includes(id))
      if (incompleteTaskIds.length > 0) {
        await supabase
          .from('tasks')
          .update({ status: 'scheduled' })
          .in('id', incompleteTaskIds)
      }

      // In edit mode, if tasks were removed from plan, set them back to 'ready'
      if (isEditMode && existingPlan) {
        const previousTaskIds = [
          existingPlan.primary_focus_task_id,
          ...(existingPlan.secondary_task_ids || []),
          ...(existingPlan.multitask_task_ids || [])
        ].filter(Boolean)
        
        const removedTaskIds = previousTaskIds.filter(id => 
          !allSelectedIds.includes(id) && !lockedTaskIds.includes(id)
        )
        
        if (removedTaskIds.length > 0) {
          await supabase
            .from('tasks')
            .update({ status: 'ready' })
            .in('id', removedTaskIds)
        }
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save plan')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="text-zinc-400">Loading your planning workspace...</div>
        </div>
      </div>
    )
  }

  if (error || !checkIn) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-6">
          <p className="text-red-400 mb-4">{error || 'Check-in not found'}</p>
          <Link
            href="/checkin"
            className="inline-block px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200"
          >
            Go to Check-in
          </Link>
        </div>
      </div>
    )
  }

  const timePercentage = getTimePercentage()
  
  // Helper to check if task or any subtask is available
  const hasAnyAvailableTask = (task: TaskWithProject): boolean => {
    if (task.status === 'ready' && !isTaskInPlan(task.id)) return true
    return task.subtasks?.some(st => hasAnyAvailableTask(st as TaskWithProject)) || false
  }
  
  // Include all tasks that have at least one ready task/subtask
  const availableTasks = allTasks.filter(t => hasAnyAvailableTask(t))
  const tasksByProject = new Map<string, TaskWithProject[]>()
  
  availableTasks.forEach(task => {
    const projectId = task.project_id || 'no-project'
    if (!tasksByProject.has(projectId)) {
      tasksByProject.set(projectId, [])
    }
    tasksByProject.get(projectId)!.push(task)
  })

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">
            {isEditMode ? 'Edit Your Plan' : 'Build Your Daily Plan'}
          </h1>
          {isEditMode ? (
            <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm font-medium rounded-full">
              Editing
            </span>
          ) : (
            <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm font-medium rounded-full">
              Draft - Not Saved
            </span>
          )}
        </div>
        <p className="text-zinc-400">
          {isEditMode 
            ? 'Adjust your plan. Completed tasks are locked.'
            : 'Review the AI suggestion and customize your plan. Your plan will be saved when you click "Finalize Plan".'
          }
        </p>
      </div>

      {/* Time Capacity Bar */}
      <div className="mb-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Time Capacity</div>
          <div className="text-sm">
            <span className={timePercentage > 100 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
              {Math.round(calculateTotalTime() / 60 * 10) / 10}h / {checkIn.available_hours}h
            </span>
            <span className="text-zinc-500 ml-2">({timePercentage}%)</span>
          </div>
        </div>
        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              timePercentage > 100
                ? 'bg-red-500'
                : timePercentage > 85
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(timePercentage, 100)}%` }}
          />
        </div>
        {timePercentage > 100 && (
          <p className="text-xs text-red-400 mt-2">
            ⚠️ You've exceeded your available time! Consider removing some tasks.
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Plan Area */}
        <div className="col-span-2 space-y-6">
          {/* AI Refinement Box */}
          <div className="bg-gradient-to-br from-purple-950/30 to-blue-950/30 border border-purple-900/50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <h3 className="font-semibold">Ask AI to Refine Your Plan</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              Tell the AI how to adjust your plan in plain English
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refineWithAI()}
                placeholder='e.g., "add more creative work" or "remove the hardest tasks" or "focus on frontend"'
                className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700 text-sm"
                disabled={refining}
              />
              <button
                onClick={refineWithAI}
                disabled={refining || !aiInstruction.trim()}
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {refining ? 'Refining...' : 'Refine'}
              </button>
            </div>
            
            {/* Refinement History */}
            {refinementHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-purple-900/30">
                <div className="text-xs text-zinc-500 mb-2">Recent refinements:</div>
                <div className="space-y-1">
                  {refinementHistory.slice(-3).map((item, idx) => (
                    <div key={idx} className="text-xs text-purple-300">
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Reasoning */}
          {(suggestedPlan || reasoning) && (
            <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-300 mb-2">
                {isEditMode ? 'Current Plan Reasoning' : 'AI Suggestion'}
              </div>
              <p className="text-sm text-blue-200 whitespace-pre-line">
                {reasoning || suggestedPlan?.reasoning}
              </p>
            </div>
          )}

          {/* Primary Focus */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Primary Focus</h2>
            <div className="min-h-[100px] p-4 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-lg">
              {planState.primaryTaskId ? (() => {
                const task = allTasksFlat.find(t => t.id === planState.primaryTaskId)
                return task ? (
                  <TaskCard
                    task={task}
                    onRemove={() => removeTaskFromPlan(planState.primaryTaskId!)}
                    category="primary"
                    isLocked={isTaskLocked(planState.primaryTaskId)}
                  />
                ) : (
                  <div className="text-center text-red-500 py-8">
                    Task not found: {planState.primaryTaskId}
                  </div>
                )
              })() : (
                <div className="text-center text-zinc-500 py-8">
                  Drag a task here or click "Set as Primary" from the sidebar
                </div>
              )}
            </div>
          </div>

          {/* Secondary Tasks */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Secondary Tasks</h2>
            <div className="min-h-[100px] p-4 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-lg space-y-2">
              {planState.secondaryTaskIds.length > 0 ? (
                planState.secondaryTaskIds.map(taskId => (
                  <TaskCard
                    key={taskId}
                    task={allTasksFlat.find(t => t.id === taskId)!}
                    onRemove={() => removeTaskFromPlan(taskId)}
                    category="secondary"
                    isLocked={isTaskLocked(taskId)}
                  />
                ))
              ) : (
                <div className="text-center text-zinc-500 py-8">
                  Add secondary tasks here (optional)
                </div>
              )}
            </div>
          </div>

          {/* Multitask Tasks */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Multitask-Safe (For Downtime)</h2>
            <div className="min-h-[80px] p-4 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-lg">
              {planState.multitaskTaskIds.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {planState.multitaskTaskIds.map(taskId => (
                    <TaskCard
                      key={taskId}
                      task={allTasksFlat.find(t => t.id === taskId)!}
                      onRemove={() => removeTaskFromPlan(taskId)}
                      category="multitask"
                      isLocked={isTaskLocked(taskId)}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-6">
                  Add low-effort tasks for downtime (optional)
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={savePlan}
              disabled={saving || (!planState.primaryTaskId && planState.secondaryTaskIds.length === 0)}
              className="flex-1 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : isEditMode ? 'Save Changes' : '✓ Finalize Plan'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              {isEditMode ? 'Back' : 'Cancel (Don\'t Save)'}
            </button>
          </div>
          
          {!isEditMode && (
            <p className="text-xs text-zinc-500 text-center mt-2">
              Your plan is not saved yet. Click "Finalize Plan" to save and start your day.
            </p>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Sidebar - Available Tasks */}
        <div className="col-span-1">
          <div className="sticky top-4">
            <h2 className="text-lg font-semibold mb-3">Available Tasks</h2>
            {isEditMode && lockedTaskIds.length > 0 && (
              <div className="mb-3 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <div className="text-xs text-green-300">
                  🔒 {lockedTaskIds.length} completed {lockedTaskIds.length === 1 ? 'task is' : 'tasks are'} locked in your plan
                </div>
              </div>
            )}
            
            {/* Search Bar */}
            <div className="mb-3">
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
              />
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
              {(() => {
                // Filter tasks based on search
                const filterTasksRecursively = (task: TaskWithProject): boolean => {
                  if (!taskSearch.trim()) return true
                  const searchLower = taskSearch.toLowerCase()
                  const matchesTitle = task.title?.toLowerCase().includes(searchLower)
                  const matchesDescription = task.description?.toLowerCase().includes(searchLower)
                  const hasMatchingSubtask = task.subtasks?.some(st => filterTasksRecursively(st as TaskWithProject))
                  return matchesTitle || matchesDescription || hasMatchingSubtask
                }
                
                // Check if a task or any of its subtasks are available (ready and not in plan)
                const hasAvailableTaskOrSubtask = (task: TaskWithProject): boolean => {
                  // Check if the task itself is available
                  const taskAvailable = task.status === 'ready' && !isTaskInPlan(task.id)
                  
                  // Check if any subtask is available (recursively)
                  const hasAvailableSubtask = task.subtasks?.some(st => 
                    hasAvailableTaskOrSubtask(st as TaskWithProject)
                  ) || false
                  
                  return taskAvailable || hasAvailableSubtask
                }
                
                const filteredProjects = Array.from(tasksByProject.entries())
                  .map(([projectId, tasks]) => {
                    const filteredTasks = tasks.filter(task => 
                      hasAvailableTaskOrSubtask(task) && 
                      filterTasksRecursively(task)
                    )
                    return { projectId, tasks: filteredTasks }
                  })
                  .filter(({ tasks }) => tasks.length > 0)
                
                if (filteredProjects.length === 0) {
                  return (
                    <div className="text-center text-zinc-500 py-8">
                      {taskSearch.trim() 
                        ? `No tasks match "${taskSearch}"`
                        : 'All available tasks are in your plan'
                      }
                    </div>
                  )
                }
                
                return filteredProjects.map(({ projectId, tasks }) => {
                  const project = projects.find(p => p.id === projectId)
                  
                  return (
                    <div key={projectId} className="mb-6 last:mb-0">
                      <h3 className="text-sm font-medium text-zinc-400 mb-2">
                        {project?.name || 'No Project'}
                      </h3>
                      <div className="space-y-2">
                        {tasks.map(task => (
                          <HierarchicalTaskCard
                            key={task.id}
                            task={task}
                            depth={0}
                            searchTerm={taskSearch}
                            isTaskInPlan={isTaskInPlan}
                            addTaskToPlan={addTaskToPlan}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onRemove, category, isLocked = false, compact = false }: {
  task: TaskWithProject
  onRemove: () => void
  category: 'primary' | 'secondary' | 'multitask'
  isLocked?: boolean
  compact?: boolean
}) {
  if (!task) return null

  if (compact) {
    return (
      <div className={`border rounded p-2 group ${
        isLocked 
          ? 'bg-green-900/20 border-green-700/50' 
          : 'bg-zinc-800 border-zinc-700'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <div className={`text-sm font-medium truncate ${isLocked ? 'line-through text-zinc-500' : ''}`}>
                {task.title}
              </div>
              {isLocked && <span className="text-xs">✓</span>}
            </div>
            <div className="text-xs text-zinc-400">{task.estimated_effort}m</div>
          </div>
          {!isLocked && (
            <button
              onClick={onRemove}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm transition-opacity"
            >
              ✕
            </button>
          )}
          {isLocked && (
            <div className="text-xs text-green-400 font-medium">Done</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-4 group ${
      isLocked 
        ? 'bg-green-900/20 border-green-700/50' 
        : 'bg-zinc-800 border-zinc-700'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium ${isLocked ? 'line-through text-zinc-500' : ''}`}>
              {task.title}
            </h3>
            {isLocked && (
              <span className="px-2 py-0.5 bg-green-900/50 text-green-300 text-xs font-medium rounded">
                ✓ Completed
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-zinc-400 line-clamp-2">{task.description}</p>
          )}
        </div>
        {!isLocked && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2 transition-opacity"
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 bg-zinc-900 text-zinc-300 rounded">
          {task.estimated_effort}m
        </span>
        <span className="px-2 py-1 bg-zinc-900 text-zinc-300 rounded">
          {task.energy_cost}
        </span>
        <span className="px-2 py-1 bg-zinc-900 text-zinc-300 rounded">
          {task.focus_depth}
        </span>
      </div>
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-yellow-400">
          ⚠️ Has {task.dependencies.length} incomplete {task.dependencies.length === 1 ? 'dependency' : 'dependencies'}
        </div>
      )}
      {isLocked && (
        <div className="mt-2 text-xs text-green-400">
          🔒 This task is completed and locked in your plan
        </div>
      )}
    </div>
  )
}

function AvailableTaskCard({ task, onAddPrimary, onAddSecondary, onAddMultitask }: {
  task: TaskWithProject
  onAddPrimary: () => void
  onAddSecondary: () => void
  onAddMultitask: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className="bg-zinc-800 border border-zinc-700 rounded p-3 cursor-pointer hover:border-zinc-600 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium line-clamp-1">{task.title}</div>
          <div className="text-xs text-zinc-400">
            {task.estimated_effort}m • {task.energy_cost} • {task.focus_depth}
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="flex gap-1 mt-2">
          <button
            onClick={onAddPrimary}
            className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
            title="Add as primary focus"
          >
            Primary
          </button>
          <button
            onClick={onAddSecondary}
            className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
            title="Add as secondary task"
          >
            Secondary
          </button>
          {task.multitask_safe && (
            <button
              onClick={onAddMultitask}
              className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
              title="Add as multitask"
            >
              Multi
            </button>
          )}
        </div>
      )}
      
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-yellow-400">
          ⚠️ {task.dependencies.length} incomplete {task.dependencies.length === 1 ? 'dependency' : 'dependencies'}
        </div>
      )}
    </div>
  )
}

function HierarchicalTaskCard({ task, depth, searchTerm, isTaskInPlan, addTaskToPlan }: {
  task: TaskWithProject
  depth: number
  searchTerm: string
  isTaskInPlan: (taskId: string) => boolean
  addTaskToPlan: (taskId: string, category: 'primary' | 'secondary' | 'multitask') => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : ''
  
  // Filter subtasks recursively based on search
  const filterSubtask = (st: any): boolean => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    const matchesTitle = st.title?.toLowerCase().includes(searchLower)
    const matchesDescription = st.description?.toLowerCase().includes(searchLower)
    const hasMatchingChild = st.subtasks?.some(filterSubtask)
    return matchesTitle || matchesDescription || hasMatchingChild
  }
  
  const visibleSubtasks = hasSubtasks 
    ? task.subtasks!.filter(st => {
        const subtask = st as any
        const isReady = subtask.status === 'ready'
        const matchesFilter = filterSubtask(st)
        const notInPlan = !isTaskInPlan(subtask.id)
        
        return isReady && matchesFilter && notInPlan
      })
    : []
  
  const inPlan = isTaskInPlan(task.id)
  
  return (
    <>
      <div
        className={`bg-zinc-800 border border-zinc-700 rounded p-3 transition-colors ${
          inPlan ? 'opacity-50' : 'cursor-pointer hover:border-zinc-600'
        } ${indentClass}`}
        onMouseEnter={() => !inPlan && setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex items-start gap-2">
          {hasSubtasks && visibleSubtasks.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-500 hover:text-zinc-300 mt-1"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium line-clamp-1 ${inPlan ? 'text-zinc-500' : ''}`}>
                  {task.title}
                  {inPlan && <span className="ml-2 text-xs text-zinc-600">(in plan)</span>}
                </div>
                <div className="text-xs text-zinc-400">
                  {task.estimated_effort}m • {task.energy_cost} • {task.focus_depth}
                </div>
              </div>
            </div>
            
            {!inPlan && showActions && (
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => addTaskToPlan(task.id, 'primary')}
                  className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
                  title="Add as primary focus"
                >
                  Primary
                </button>
                <button
                  onClick={() => addTaskToPlan(task.id, 'secondary')}
                  className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
                  title="Add as secondary task"
                >
                  Secondary
                </button>
                {task.multitask_safe && (
                  <button
                    onClick={() => addTaskToPlan(task.id, 'multitask')}
                    className="flex-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-xs rounded transition-colors"
                    title="Add as multitask"
                  >
                    Multi
                  </button>
                )}
              </div>
            )}
            
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="mt-2 text-xs text-yellow-400">
                ⚠️ {task.dependencies.length} incomplete {task.dependencies.length === 1 ? 'dependency' : 'dependencies'}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Nested subtasks */}
      {isExpanded && visibleSubtasks.length > 0 && (
        <div className="mt-1 space-y-1 ml-4 border-l-2 border-zinc-800 pl-2">
          {visibleSubtasks.map((subtask: any) => (
            <HierarchicalTaskCard
              key={subtask.id}
              task={subtask as TaskWithProject}
              depth={depth + 1}
              searchTerm={searchTerm}
              isTaskInPlan={isTaskInPlan}
              addTaskToPlan={addTaskToPlan}
            />
          ))}
        </div>
      )}
    </>
  )
}

