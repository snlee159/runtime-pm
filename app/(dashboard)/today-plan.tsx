'use client'

import { useState, useEffect } from 'react'
import { Task, DailyPlan } from '@/lib/types'
import Link from 'next/link'
import { TaskDetailModal } from './task-detail-modal'
import { useRouter } from 'next/navigation'

interface TodayPlanProps {
  plan: DailyPlan
  tasks: Task[]
  today: string
}

// Calculate task completion progress recursively
function calculateProgress(task: Task): { completed: number; total: number } {
  if (!task.subtasks || task.subtasks.length === 0) {
    return {
      completed: task.status === 'completed' ? 1 : 0,
      total: 1,
    }
  }

  let completed = 0
  let total = 0

  for (const subtask of task.subtasks) {
    const progress = calculateProgress(subtask)
    completed += progress.completed
    total += progress.total
  }

  return { completed, total }
}

export function TodayPlan({ plan, tasks, today }: TodayPlanProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [inspiration, setInspiration] = useState<{
    motivational_quote: string
    productivity_tip: string
  } | null>(null)
  const router = useRouter()

  // Fetch daily inspiration on mount
  useEffect(() => {
    const fetchInspiration = async () => {
      try {
        const response = await fetch('/api/daily-inspiration')
        if (response.ok) {
          const data = await response.json()
          setInspiration(data)
        }
      } catch (error) {
        console.error('Error fetching daily inspiration:', error)
      }
    }
    fetchInspiration()
  }, [])

  const primaryTask = tasks.find((t: Task) => t.id === plan.primary_focus_task_id)
  const secondaryTasks = tasks.filter((t: Task) => plan.secondary_task_ids?.includes(t.id))
  const multitaskTasks = tasks.filter((t: Task) => plan.multitask_task_ids?.includes(t.id))

  const handleTaskComplete = async (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation() // Prevent opening modal when clicking checkmark
    }
    
    // Don't show loading state - just toggle immediately for better UX
    // Import supabase client dynamically
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    // Find the task to check its current status
    const task = tasks.find((t: Task) => t.id === taskId)
    const isCompleted = task?.status === 'completed'
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: isCompleted ? 'ready' : 'completed',
        completed_at: isCompleted ? null : new Date().toISOString(),
      })
      .eq('id', taskId)

    if (!error) {
      // Refresh the page to update the plan
      router.refresh()
    } else {
      console.error('Error updating task:', error)
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Today's Plan</h1>
            <p className="text-zinc-400">
              {new Date(today).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Link
            href={`/plan-editor?date=${today}`}
            className="px-4 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Edit Plan
          </Link>
        </div>

        {/* Progress Tracker */}
        {(() => {
          const allPlanTasks = [
            ...(primaryTask ? [primaryTask] : []),
            ...secondaryTasks,
            ...multitaskTasks
          ]
          
          const completedCount = allPlanTasks.filter(t => t.status === 'completed').length
          const totalCount = allPlanTasks.length
          const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          
          return (
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Today's Progress</h3>
                <span className="text-2xl font-bold text-purple-400">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">
                {completedCount} of {totalCount} {totalCount === 1 ? 'task' : 'tasks'} completed
              </p>
            </div>
          )
        })()}

        {/* Daily Inspiration */}
        {inspiration && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Motivational Quote */}
            <div className="p-5 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💪</span>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                    Daily Motivation
                  </h4>
                  <p className="text-sm text-zinc-300 italic leading-relaxed">
                    {inspiration.motivational_quote}
                  </p>
                </div>
              </div>
            </div>

            {/* Productivity Tip */}
            <div className="p-5 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">
                    Productivity Tip
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {inspiration.productivity_tip}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Reasoning */}
        {plan.reasoning && (
          <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Today's Focus & Strategy
            </h3>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-line">{plan.reasoning}</p>
          </div>
        )}

        {/* Primary Focus */}
        {primaryTask && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Primary Focus
            </h2>
            <div 
              className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-lg p-6 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => setSelectedTask(primaryTask)}
            >
              {primaryTask.parent_task && (() => {
                const progress = calculateProgress(primaryTask.parent_task)
                const progressPercent = Math.round((progress.completed / progress.total) * 100)
                return (
                  <div className="mb-3">
                    <div className="text-xs text-zinc-500 mb-2">
                      Part of: {primaryTask.parent_task.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-zinc-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>
              )
            })()}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-2xl font-semibold flex-1">{primaryTask.title}</h3>
                <div className="flex items-center gap-3 ml-4">
                  <span className="text-sm text-zinc-400">
                    {primaryTask.estimated_effort}m
                  </span>
                  <button
                    onClick={(e) => handleTaskComplete(primaryTask.id, e)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      primaryTask.status === 'completed'
                        ? 'bg-green-500 border-green-500 hover:bg-green-600'
                        : 'border-zinc-600 hover:border-green-500 hover:bg-green-500/20'
                    }`}
                    title={primaryTask.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    <span className={primaryTask.status === 'completed' ? 'text-white font-bold' : 'text-zinc-600 hover:text-green-500'}>✓</span>
                  </button>
                </div>
              </div>
              {primaryTask.description && (
                <p className="text-zinc-400 mb-4 whitespace-pre-line text-sm">{primaryTask.description}</p>
              )}
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                  {primaryTask.energy_cost} energy
                </span>
                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                  {primaryTask.focus_depth} focus
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Tasks */}
        {secondaryTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Secondary Tasks
            </h2>
            <div className="space-y-3">
              {secondaryTasks.map((task: Task) => (
                <div 
                  key={task.id} 
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => setSelectedTask(task)}
                >
                  {task.parent_task && (() => {
                    const progress = calculateProgress(task.parent_task)
                    const progressPercent = Math.round((progress.completed / progress.total) * 100)
                    return (
                      <div className="mb-2">
                        <div className="text-xs text-zinc-500 mb-1">
                          Part of: {task.parent_task.title}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-zinc-500 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 whitespace-nowrap">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-zinc-400 whitespace-pre-line mt-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-zinc-400">{task.estimated_effort}m</span>
                      <button
                        onClick={(e) => handleTaskComplete(task.id, e)}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                          task.status === 'completed'
                            ? 'bg-green-500 border-green-500 hover:bg-green-600'
                            : 'border-zinc-600 hover:border-green-500 hover:bg-green-500/20'
                        }`}
                        title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        <span className={task.status === 'completed' ? 'text-white font-bold text-sm' : 'text-zinc-600 hover:text-green-500 text-sm'}>✓</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                      {task.energy_cost}
                    </span>
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                      {task.focus_depth}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multitask Tasks */}
        {multitaskTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Multitask-Safe (For Downtime)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {multitaskTasks.map((task: Task) => (
                <div 
                  key={task.id} 
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => setSelectedTask(task)}
                >
                  {task.parent_task && (
                    <div className="text-xs text-zinc-500 mb-1">
                      {task.parent_task.title}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{task.title}</h3>
                      <span className="text-xs text-zinc-500">{task.estimated_effort}m</span>
                    </div>
                    <button
                      onClick={(e) => handleTaskComplete(task.id, e)}
                      className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                        task.status === 'completed'
                          ? 'bg-green-500 border-green-500 hover:bg-green-600'
                          : 'border-zinc-600 hover:border-green-500 hover:bg-green-500/20'
                      }`}
                      title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      <span className={task.status === 'completed' ? 'text-white font-bold text-xs' : 'text-zinc-600 hover:text-green-500 text-xs'}>✓</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done Boundary */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <div className="text-center">
            <p className="text-zinc-500 mb-4">Done for today after completing above</p>
            <Link
              href="/wrap"
              className="inline-block px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              End-of-Day Wrap
            </Link>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={() => {
            setSelectedTask(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

