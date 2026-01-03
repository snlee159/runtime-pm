// Core type definitions for the Runtime PM system

export type EnergyLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
export type EnergyCost = 'low' | 'medium' | 'high'
export type FocusDepth = 'deep' | 'shallow'
export type ContextType = 'cognitive' | 'admin' | 'physical'
export type TaskStatus = 'ready' | 'scheduled' | 'in_progress' | 'completed' | 'deferred' | 'dropped'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type DroppedReason = 'planning_error' | 'energy' | 'interruption' | 'no_longer_relevant'
export type PaceAssessment = 'over_scoping' | 'under_scoping' | 'balanced'

export interface Project {
  id: string
  user_id: string
  name: string
  description?: string
  status: ProjectStatus
  color?: string
  display_order?: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id?: string
  parent_task_id?: string // For sub-tasks
  title: string
  description?: string
  
  // Execution metadata
  estimated_effort: number // minutes
  energy_cost: EnergyCost
  focus_depth: FocusDepth
  context_type: ContextType
  multitask_safe: boolean
  
  // Status
  status: TaskStatus
  completed_at?: string
  dropped_reason?: DroppedReason
  
  // Hierarchy
  display_order: number
  depth_level: number
  ai_generated: boolean
  ai_metadata?: any
  
  created_at: string
  updated_at: string
  
  // Relations
  project?: Project
  parent_task?: Task
  subtasks?: Task[]
  
  // Dependencies
  dependencies?: TaskDependency[] // Tasks this task depends on
  dependent_tasks?: TaskDependency[] // Tasks that depend on this task
}

export interface TaskDependency {
  id: string
  task_id: string // The dependent task
  depends_on_task_id: string // The task it depends on
  created_at: string
  
  // Relations
  depends_on_task?: Task // The actual task this depends on
}

// Extended task type with parent context
export interface TaskWithParent extends Task {
  parent_task?: Task
}

export interface DailyCheckIn {
  id: string
  user_id: string
  date: string
  energy_level: EnergyLevel
  available_hours: number
  constraints?: string
  priorities?: string
  created_at: string
}

export interface DailyPlan {
  id: string
  user_id: string
  date: string
  checkin_id?: string
  
  // Planning decisions
  primary_focus_task_id?: string
  secondary_task_ids: string[]
  multitask_task_ids: string[]
  
  // Metadata
  reasoning?: string
  estimated_total_effort: number
  context_switches: number
  
  created_at: string
  
  // Relations
  primary_focus_task?: Task
  secondary_tasks?: Task[]
  multitask_tasks?: Task[]
  checkin?: DailyCheckIn
}

export interface DailyWrap {
  id: string
  user_id: string
  date: string
  plan_id?: string
  
  // Outcomes
  tasks_completed: string[]
  tasks_deferred: string[]
  tasks_dropped: string[]
  
  // Feedback
  actual_energy?: string
  what_went_well?: string
  what_broke?: string
  
  created_at: string
}

export interface WeeklySummary {
  id: string
  user_id: string
  week_start_date: string
  week_end_date: string
  
  // Metrics
  total_tasks_completed: number
  total_tasks_dropped: number
  avg_context_switches: number
  avg_energy_match: number
  
  // Insights
  pace_assessment?: PaceAssessment
  insights?: string
  
  created_at: string
}

// Form types
export interface CheckInFormData {
  energy_level: EnergyLevel
  available_hours: number
  constraints?: string
  priorities?: string
}

export interface TaskFormData {
  title: string
  description?: string
  project_id?: string
  estimated_effort?: number
  energy_cost?: EnergyCost
  focus_depth?: FocusDepth
  context_type?: ContextType
  multitask_safe?: boolean
  dependency_task_ids?: string[] // IDs of tasks this task depends on
}

export interface ProjectFormData {
  name: string
  description?: string
  status?: ProjectStatus
}

export interface WrapFormData {
  tasks_completed: string[]
  tasks_deferred: string[]
  tasks_dropped: string[]
  actual_energy?: string
  what_went_well?: string
  what_broke?: string
}

