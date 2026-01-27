/**
 * Secure API Service Layer
 * 
 * All database operations go through Supabase Edge Functions instead of direct database access.
 * This ensures proper security, rate limiting, and input validation.
 */

import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Call a Supabase Edge Function
 */
async function callEdgeFunction(
  functionName: string,
  body: Record<string, any> = {},
  customHeaders: Record<string, string> = {}
): Promise<any> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
    "apikey": SUPABASE_ANON_KEY,
    ...customHeaders,
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || `Request failed: ${response.status}`)
  }

  return await response.json()
}

/**
 * Data Operations API
 */
export const dataAPI = {
  /**
   * Select data from a table
   */
  select: async (
    table: string,
    options: {
      filters?: Record<string, any>
      select?: string
    } = {}
  ) => {
    return callEdgeFunction("data-operations", {
      table,
      operation: "select",
      filters: options.filters,
      select: options.select || "*",
    })
  },

  /**
   * Insert data into a table
   */
  insert: async (table: string, data: Record<string, any> | Record<string, any>[]) => {
    return callEdgeFunction("data-operations", {
      table,
      operation: "insert",
      data,
    })
  },

  /**
   * Update data in a table
   */
  update: async (
    table: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ) => {
    return callEdgeFunction("data-operations", {
      table,
      operation: "update",
      data,
      filters,
    })
  },

  /**
   * Upsert data in a table
   */
  upsert: async (
    table: string,
    data: Record<string, any> | Record<string, any>[],
    options?: Record<string, any>
  ) => {
    return callEdgeFunction("data-operations", {
      table,
      operation: "upsert",
      data,
      options,
    })
  },

  /**
   * Delete data from a table
   */
  delete: async (table: string, filters: Record<string, any>) => {
    return callEdgeFunction("data-operations", {
      table,
      operation: "delete",
      filters,
    })
  },
}

/**
 * Task Operations
 */
export const taskAPI = {
  /**
   * Get all tasks for the current user
   */
  getAll: async (filters?: { status?: string; project_id?: string }) => {
    const queryFilters: Record<string, any> = {}
    
    if (filters?.status) {
      queryFilters.eq = { status: filters.status }
    }
    
    if (filters?.project_id) {
      queryFilters.eq = { ...queryFilters.eq, project_id: filters.project_id }
    }

    return dataAPI.select("tasks", { filters: queryFilters })
  },

  /**
   * Get a single task by ID
   */
  getById: async (id: string) => {
    return dataAPI.select("tasks", {
      filters: { eq: { id }, single: true },
    })
  },

  /**
   * Create a new task
   */
  create: async (taskData: Record<string, any>) => {
    return dataAPI.insert("tasks", taskData)
  },

  /**
   * Update a task
   */
  update: async (id: string, updates: Record<string, any>) => {
    return dataAPI.update("tasks", updates, { eq: { id } })
  },

  /**
   * Delete a task
   */
  delete: async (id: string) => {
    return dataAPI.delete("tasks", { eq: { id } })
  },

  /**
   * Complete a task
   */
  complete: async (id: string) => {
    return dataAPI.update("tasks", {
      status: "complete",
      completed_at: new Date().toISOString(),
    }, { eq: { id } })
  },
}

/**
 * Project Operations
 */
export const projectAPI = {
  getAll: async () => {
    return dataAPI.select("projects", {
      filters: { order: { column: "display_order", ascending: true } },
    })
  },

  create: async (projectData: Record<string, any>) => {
    return dataAPI.insert("projects", projectData)
  },

  update: async (id: string, updates: Record<string, any>) => {
    return dataAPI.update("projects", updates, { eq: { id } })
  },

  delete: async (id: string) => {
    return dataAPI.delete("projects", { eq: { id } })
  },
}

/**
 * Daily Check-in Operations
 */
export const checkinAPI = {
  getByDate: async (date: string) => {
    return dataAPI.select("daily_checkins", {
      filters: { eq: { date }, single: true },
    })
  },

  create: async (checkinData: Record<string, any>) => {
    return dataAPI.insert("daily_checkins", checkinData)
  },

  upsert: async (checkinData: Record<string, any>) => {
    return dataAPI.upsert("daily_checkins", checkinData, {
      onConflict: "user_id,date",
    })
  },
}

/**
 * Daily Plan Operations
 */
export const planAPI = {
  getByDate: async (date: string) => {
    return dataAPI.select("daily_plans", {
      filters: { eq: { date }, single: true },
    })
  },

  upsert: async (planData: Record<string, any>) => {
    return dataAPI.upsert("daily_plans", planData, {
      onConflict: "user_id,date",
    })
  },
}

/**
 * Daily Wrap Operations
 */
export const wrapAPI = {
  getByDate: async (date: string) => {
    return dataAPI.select("daily_wraps", {
      filters: { eq: { date }, single: true },
    })
  },

  upsert: async (wrapData: Record<string, any>) => {
    return dataAPI.upsert("daily_wraps", wrapData, {
      onConflict: "user_id,date",
    })
  },
}

/**
 * Contact Form Submission
 */
export const contactAPI = {
  submit: async (data: {
    name: string
    email: string
    message: string
    company?: string
  }) => {
    return callEdgeFunction("contact-submit", data)
  },
}

/**
 * User Profile Operations
 */
export const profileAPI = {
  get: async () => {
    return dataAPI.select("user_profiles", {
      filters: { single: true },
    })
  },

  update: async (updates: Record<string, any>) => {
    // Note: user_id filter is applied automatically by the Edge Function
    return dataAPI.update("user_profiles", updates, {})
  },

  upsert: async (profileData: Record<string, any>) => {
    return dataAPI.upsert("user_profiles", profileData)
  },
}

/**
 * Task Dependencies Operations
 */
export const dependencyAPI = {
  getForTask: async (taskId: string) => {
    return dataAPI.select("task_dependencies", {
      filters: { eq: { task_id: taskId } },
    })
  },

  create: async (taskId: string, dependsOnTaskId: string) => {
    return dataAPI.insert("task_dependencies", {
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
    })
  },

  delete: async (id: string) => {
    return dataAPI.delete("task_dependencies", { eq: { id } })
  },

  deleteForTask: async (taskId: string) => {
    return dataAPI.delete("task_dependencies", { eq: { task_id: taskId } })
  },
}
