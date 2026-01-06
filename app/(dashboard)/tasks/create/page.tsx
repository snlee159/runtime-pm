'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Task, Project, EnergyCost, FocusDepth, ContextType } from '@/lib/types'
import { useState as useReactState } from 'react'

interface SubTask {
  id: string
  title: string
  description?: string
  estimated_effort: number
  energy_cost: EnergyCost
  focus_depth: FocusDepth
  context_type: ContextType
  multitask_safe: boolean
  display_order: number
  subtasks?: SubTask[] // Nested sub-tasks
  depends_on_indices?: number[] // Indices of sibling tasks this depends on
}

// Component for rendering subtasks recursively
function SubTaskItem({
  subtask,
  index,
  depth,
  onUpdate,
  onRemove,
  allSiblings = [],
}: {
  subtask: SubTask
  index: number
  depth: number
  onUpdate: (id: string, updates: Partial<SubTask>) => void
  onRemove: (id: string) => void
  allSiblings?: SubTask[]
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showOptions, setShowOptions] = useState(false)
  const hasNested = subtask.subtasks && subtask.subtasks.length > 0
  const indentClass = depth === 0 ? '' : 'ml-6 border-l-2 border-zinc-700 pl-4'
  
  // Get available siblings for dependencies (exclude self)
  const availableSiblings = allSiblings.filter((_, idx) => idx !== index)
  const currentDependencies = subtask.depends_on_indices || []

  return (
    <div className={indentClass}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-zinc-500">{index + 1}.</span>
            {hasNested && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-zinc-400 hover:text-zinc-300"
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <input
              type="text"
              value={subtask.title}
              onChange={(e) => onUpdate(subtask.id, { title: e.target.value })}
              placeholder="Sub-task title"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-700"
            />
            {subtask.description && (
              <textarea
                value={subtask.description}
                onChange={(e) => onUpdate(subtask.id, { description: e.target.value })}
                placeholder="Description..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[60px]"
              />
            )}
            {!hasNested && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    value={subtask.estimated_effort}
                    onChange={(e) => onUpdate(subtask.id, { estimated_effort: parseInt(e.target.value) })}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs"
                    min="5"
                  />
                  <select
                    value={subtask.energy_cost}
                    onChange={(e) => onUpdate(subtask.id, { energy_cost: e.target.value as EnergyCost })}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs"
                  >
                    <option value="low">Low E</option>
                    <option value="medium">Med E</option>
                    <option value="high">High E</option>
                  </select>
                  <select
                    value={subtask.focus_depth}
                    onChange={(e) => onUpdate(subtask.id, { focus_depth: e.target.value as FocusDepth })}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs"
                  >
                    <option value="shallow">Shallow</option>
                    <option value="deep">Deep</option>
                  </select>
                  <select
                    value={subtask.context_type}
                    onChange={(e) => onUpdate(subtask.id, { context_type: e.target.value as ContextType })}
                    className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs"
                  >
                    <option value="cognitive">Cog</option>
                    <option value="admin">Admin</option>
                    <option value="physical">Phys</option>
                  </select>
                </div>
                
              </>
            )}
            
            {/* Additional Options (for all tasks, not just leaf) */}
            <div className="mt-3 border-t border-zinc-700 pt-3">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors px-2 py-1.5 rounded bg-zinc-800/50 hover:bg-zinc-800 w-full"
              >
                <span>{showOptions ? '▼' : '▶'}</span>
                <span>Additional Options (Dependencies)</span>
                {currentDependencies.length > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded text-xs font-semibold">
                    {currentDependencies.length} dep{currentDependencies.length !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
              
              {showOptions && (
                <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded space-y-3">
                  {/* Dependencies Selector */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-zinc-400">
                      Dependencies (must be completed first)
                    </label>
                    {availableSiblings.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No other sibling tasks available</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {allSiblings.map((sibling, siblingIndex) => {
                          if (siblingIndex === index) return null // Skip self
                          const isSelected = currentDependencies.includes(siblingIndex)
                          return (
                            <label
                              key={sibling.id}
                              className="flex items-start gap-2 p-2 hover:bg-zinc-800/50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newDeps = e.target.checked
                                    ? [...currentDependencies, siblingIndex]
                                    : currentDependencies.filter(idx => idx !== siblingIndex)
                                  onUpdate(subtask.id, { depends_on_indices: newDeps })
                                }}
                                className="mt-0.5 rounded border-zinc-700"
                              />
                              <div className="flex-1">
                                <div className="text-xs text-zinc-300">
                                  #{siblingIndex + 1}: {sibling.title}
                                </div>
                                {sibling.description && (
                                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                    {sibling.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          
          </div>
          <button
            type="button"
            onClick={() => onRemove(subtask.id)}
            className="text-red-400 hover:text-red-300 text-sm p-2"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Nested subtasks */}
      {hasNested && isExpanded && (
        <div className="mt-3 space-y-3">
          {subtask.subtasks!.map((nested, nestedIndex) => (
            <SubTaskItem
              key={nested.id}
              subtask={nested}
              index={nestedIndex}
              depth={depth + 1}
              onUpdate={onUpdate}
              onRemove={onRemove}
              allSiblings={subtask.subtasks!}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CreateTaskPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  
  // AI-generated metadata
  const [estimatedEffort, setEstimatedEffort] = useState(30)
  const [energyCost, setEnergyCost] = useState<EnergyCost>('medium')
  const [focusDepth, setFocusDepth] = useState<FocusDepth>('shallow')
  const [contextType, setContextType] = useState<ContextType>('cognitive')
  const [multitaskSafe, setMultitaskSafe] = useState(false)
  
  // Dependencies for parent task
  const [existingTasks, setExistingTasks] = useState<Task[]>([])
  const [parentDependencyIds, setParentDependencyIds] = useState<string[]>([])
  const [showParentOptions, setShowParentOptions] = useState(false)
  
  // Sub-tasks
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [aiReasoning, setAiReasoning] = useState('')
  
  // UI state
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProjects()
    loadExistingTasks()
  }, [])

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
    setProjects(data || [])
  }

  const loadExistingTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load all existing tasks (parent tasks only, no subtasks)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, description, project_id, status')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .in('status', ['incomplete', 'complete'])
      .order('created_at', { ascending: false })
    
    setExistingTasks(tasks || [])
  }

  const analyzeWithAI = async () => {
    if (!title.trim()) {
      setError('Enter a task title first')
      return
    }

    setAnalyzing(true)
    setError(null)
    setHasAnalyzed(false)

    try {
      const response = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          project_id: projectId || null,
        }),
      })

      if (!response.ok) {
        throw new Error('AI analysis failed')
      }

      const { breakdown } = await response.json()

      // Update parent task metadata
      setEstimatedEffort(breakdown.parent_analysis.estimated_effort)
      setEnergyCost(breakdown.parent_analysis.energy_cost)
      setFocusDepth(breakdown.parent_analysis.focus_depth)
      setContextType(breakdown.parent_analysis.context_type)
      setMultitaskSafe(breakdown.parent_analysis.multitask_safe)
      setAiReasoning(breakdown.reasoning)

      // Generate sub-tasks with nested structure
      if (breakdown.subtasks && breakdown.subtasks.length > 0) {
        const generateSubtaskTree = (tasks: any[], parentIndex = ''): SubTask[] => {
          return tasks.map((st: any, index: number) => {
            const id = `temp-${Date.now()}-${parentIndex}${index}`
            const subtask: SubTask = {
              id,
              title: st.title,
              description: st.description,
              estimated_effort: st.estimated_effort,
              energy_cost: st.energy_cost,
              focus_depth: st.focus_depth,
              context_type: st.context_type,
              multitask_safe: st.multitask_safe,
              display_order: index,
              depends_on_indices: st.depends_on_indices || [], // Preserve dependency info
            }
            
            // Recursively handle nested subtasks
            if (st.subtasks && st.subtasks.length > 0) {
              subtask.subtasks = generateSubtaskTree(st.subtasks, `${parentIndex}${index}-`)
            }
            
            return subtask
          })
        }
        
        const generatedSubtasks = generateSubtaskTree(breakdown.subtasks)
        setSubtasks(generatedSubtasks)
      }
      
      setHasAnalyzed(true)
    } catch (err: any) {
      setError(err.message || 'AI analysis failed. Check your OpenAI API key.')
    } finally {
      setAnalyzing(false)
    }
  }

  const addSubtask = () => {
    setSubtasks([
      ...subtasks,
      {
        id: `temp-${Date.now()}`,
        title: '',
        description: '',
        estimated_effort: 30,
        energy_cost: 'medium',
        focus_depth: 'shallow',
        context_type: 'cognitive',
        multitask_safe: false,
        display_order: subtasks.length,
      },
    ])
  }

  const updateSubtask = (id: string, updates: Partial<SubTask>) => {
    const updateRecursive = (tasks: SubTask[]): SubTask[] => {
      return tasks.map(st => {
        if (st.id === id) {
          return { ...st, ...updates }
        }
        if (st.subtasks) {
          return { ...st, subtasks: updateRecursive(st.subtasks) }
        }
        return st
      })
    }
    setSubtasks(updateRecursive(subtasks))
  }

  const removeSubtask = (id: string) => {
    const removeRecursive = (tasks: SubTask[]): SubTask[] => {
      return tasks
        .filter(st => st.id !== id)
        .map(st => ({
          ...st,
          subtasks: st.subtasks ? removeRecursive(st.subtasks) : undefined
        }))
    }
    setSubtasks(removeRecursive(subtasks))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create parent task
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title,
          description: description || null,
          estimated_effort: estimatedEffort,
          energy_cost: energyCost,
          focus_depth: focusDepth,
          context_type: contextType,
          multitask_safe: multitaskSafe,
          status: 'incomplete',
          ai_generated: subtasks.length > 0,
          ai_metadata: aiReasoning ? { reasoning: aiReasoning } : null,
        })
        .select()
        .single()

      if (parentError) throw parentError

      // Create sub-tasks recursively if any
      if (subtasks.length > 0 && parentTask) {
        // Track mapping of temporary IDs to real database IDs for dependency creation
        const tempIdToRealId: Map<string, string> = new Map()
        const dependenciesToCreate: Array<{ taskId: string; dependsOnId: string }> = []

        const insertSubtasksRecursively = async (
          tasks: SubTask[],
          parentId: string,
          depth: number = 1
        ): Promise<void> => {
          const subtaskInserts = tasks.map(st => ({
            user_id: user.id,
            parent_task_id: parentId,
            project_id: projectId || null,
            title: st.title,
            description: st.description || null,
            estimated_effort: st.estimated_effort,
            energy_cost: st.energy_cost,
            focus_depth: st.focus_depth,
            context_type: st.context_type,
            multitask_safe: st.multitask_safe,
            status: 'incomplete',
            display_order: st.display_order,
            depth_level: depth,
            ai_generated: true,
          }))

          const { data: createdSubtasks, error: subtasksError } = await supabase
            .from('tasks')
            .insert(subtaskInserts)
            .select()

          if (subtasksError) throw subtasksError

          // Map temporary IDs to real database IDs
          if (createdSubtasks) {
            for (let i = 0; i < tasks.length; i++) {
              tempIdToRealId.set(tasks[i].id, createdSubtasks[i].id)
              
              // Record dependencies to create later (using indices within this level)
              if (tasks[i].depends_on_indices && tasks[i].depends_on_indices!.length > 0) {
                for (const depIndex of tasks[i].depends_on_indices!) {
                  if (depIndex >= 0 && depIndex < tasks.length) {
                    dependenciesToCreate.push({
                      taskId: createdSubtasks[i].id,
                      dependsOnId: createdSubtasks[depIndex].id,
                    })
                  }
                }
              }
            }

            // Handle nested subtasks
            for (let i = 0; i < tasks.length; i++) {
              if (tasks[i].subtasks && tasks[i].subtasks!.length > 0) {
                await insertSubtasksRecursively(
                  tasks[i].subtasks!,
                  createdSubtasks[i].id,
                  depth + 1
                )
              }
            }
          }
        }

        await insertSubtasksRecursively(subtasks, parentTask.id)

        // Create all dependencies after all tasks are created
        if (dependenciesToCreate.length > 0) {
          const dependencyInserts = dependenciesToCreate.map(dep => ({
            task_id: dep.taskId,
            depends_on_task_id: dep.dependsOnId,
          }))

          const { error: depsError } = await supabase
            .from('task_dependencies')
            .insert(dependencyInserts)

          if (depsError) {
            console.error('Failed to create task dependencies:', depsError)
            // Don't throw - dependencies are nice to have but not critical
          }
        }
      }

      // Create parent task dependencies
      if (parentDependencyIds.length > 0 && parentTask) {
        const parentDependencyInserts = parentDependencyIds.map(depId => ({
          task_id: parentTask.id,
          depends_on_task_id: depId,
        }))

        const { error: parentDepsError } = await supabase
          .from('task_dependencies')
          .insert(parentDependencyInserts)

        if (parentDepsError) {
          console.error('Failed to create parent task dependencies:', parentDepsError)
          // Don't throw - dependencies are nice to have but not critical
        }
      }

      router.push('/tasks')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save task')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create Task</h1>
        <p className="text-zinc-400">AI will help break down and estimate your task</p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Task Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Task Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context to help AI understand..."
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[80px]"
              />
            </div>

            <div>
              <label htmlFor="project" className="block text-sm font-medium mb-2">
                Project (optional)
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Additional Options for Parent Task */}
            <div className="border-t border-zinc-700 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setShowParentOptions(!showParentOptions)}
                className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded bg-zinc-800/50 hover:bg-zinc-800 w-full"
              >
                <span>{showParentOptions ? '▼' : '▶'}</span>
                <span>Additional Options (Dependencies, etc.)</span>
                {parentDependencyIds.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded text-xs font-semibold">
                    {parentDependencyIds.length} dependency{parentDependencyIds.length !== 1 ? 'ies' : ''}
                  </span>
                )}
              </button>
              
              {showParentOptions && (
                <div className="mt-3 p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <label className="block text-sm font-medium mb-3 text-zinc-400">
                    Dependencies (other tasks that must be completed first)
                  </label>
                  {existingTasks.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">No existing tasks available as dependencies</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {existingTasks.map((task) => {
                        const isSelected = parentDependencyIds.includes(task.id)
                        const taskProject = projects.find(p => p.id === task.project_id)
                        return (
                          <label
                            key={task.id}
                            className="flex items-start gap-3 p-3 hover:bg-zinc-900 rounded cursor-pointer border border-zinc-800"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setParentDependencyIds([...parentDependencyIds, task.id])
                                } else {
                                  setParentDependencyIds(parentDependencyIds.filter(id => id !== task.id))
                                }
                              }}
                              className="mt-1 rounded border-zinc-700"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-zinc-300 font-medium">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                  {task.description}
                                </div>
                              )}
                              {taskProject && (
                                <div className="text-xs text-zinc-600 mt-1">
                                  📁 {taskProject.name}
                                </div>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
              onClick={analyzeWithAI}
              disabled={analyzing || !title.trim()}
              className="mt-4 w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? '🤖 Analyzing with AI...' : '✨ Analyze with AI'}
            </button>
        </div>

        {/* AI Reasoning */}
        {aiReasoning && hasAnalyzed && (
          <div className="bg-blue-950/30 border border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-200 whitespace-pre-line">
              <span className="font-semibold">AI Analysis:</span> {aiReasoning}
            </p>
          </div>
        )}

        {/* Execution Metadata */}
        {hasAnalyzed && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Execution Metadata (AI-Generated)
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="effort" className="block text-sm font-medium mb-2">
                Estimated Effort (minutes)
              </label>
              <input
                id="effort"
                type="number"
                value={estimatedEffort}
                onChange={(e) => setEstimatedEffort(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                min="5"
                step="5"
              />
            </div>

            <div>
              <label htmlFor="energy" className="block text-sm font-medium mb-2">
                Energy Cost
              </label>
              <select
                id="energy"
                value={energyCost}
                onChange={(e) => setEnergyCost(e.target.value as EnergyCost)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="focus" className="block text-sm font-medium mb-2">
                Focus Depth
              </label>
              <select
                id="focus"
                value={focusDepth}
                onChange={(e) => setFocusDepth(e.target.value as FocusDepth)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="shallow">Shallow</option>
                <option value="deep">Deep</option>
              </select>
            </div>

            <div>
              <label htmlFor="context" className="block text-sm font-medium mb-2">
                Context Type
              </label>
              <select
                id="context"
                value={contextType}
                onChange={(e) => setContextType(e.target.value as ContextType)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="cognitive">Cognitive</option>
                <option value="admin">Admin</option>
                <option value="physical">Physical</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input
              type="checkbox"
              id="multitask"
              checked={multitaskSafe}
              onChange={(e) => setMultitaskSafe(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950"
            />
            <label htmlFor="multitask" className="text-sm">
              Multitask-safe (can be done alongside other activities)
            </label>
          </div>
        </div>
        )}

        {/* Sub-tasks */}
        {hasAnalyzed && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Sub-tasks {subtasks.length > 0 && `(${subtasks.length})`}
            </h2>
            <button
              onClick={addSubtask}
              className="px-4 py-2 bg-zinc-800 text-white text-sm rounded-lg hover:bg-zinc-700 transition-colors"
            >
              + Add Sub-task
            </button>
          </div>

          {subtasks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              Use AI to automatically break down complex tasks
            </p>
          ) : (
            <div className="space-y-3">
              {subtasks.map((subtask, index) => (
                <SubTaskItem
                  key={subtask.id}
                  subtask={subtask}
                  index={index}
                  depth={0}
                  onUpdate={updateSubtask}
                  onRemove={removeSubtask}
                  allSiblings={subtasks}
                />
              ))}
            </div>
          )}
        </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        {hasAnalyzed && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Create Task'}
          </button>
          <button
            onClick={() => router.push('/tasks')}
            className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
        )}
      </div>
    </div>
  )
}

