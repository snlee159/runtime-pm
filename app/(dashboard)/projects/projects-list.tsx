'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, ProjectStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface ProjectsListProps {
  initialProjects: Project[]
}

const PROJECT_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
]

export function ProjectsList({ initialProjects }: ProjectsListProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        color,
        status: 'active',
      })
      .select()
      .single()

    if (!error && data) {
      setProjects([data, ...projects])
      setName('')
      setDescription('')
      setColor('#3b82f6')
      setShowForm(false)
    }

    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setProjects(projects.map(p => p.id === id ? { ...p, status } : p))
    }
  }

  const activeProjects = projects.filter(p => p.status === 'active')
  const otherProjects = projects.filter(p => p.status !== 'active')

  return (
    <div className="space-y-6">
      {/* Create Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
        >
          + New Project
        </button>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder="e.g., Launch new website"
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
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[80px]"
                placeholder="Brief description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      color === colorOption.value 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Active
          </h2>
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <div 
                key={project.id} 
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6"
                style={{ borderLeftColor: project.color || '#6b7280', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project.color || '#6b7280' }}
                    />
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                  </div>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                    className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                {project.description && (
                  <p className="text-zinc-400">{project.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Projects */}
      {otherProjects.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Other
          </h2>
          <div className="space-y-3">
            {otherProjects.map((project) => (
              <div 
                key={project.id} 
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 opacity-60"
                style={{ borderLeftColor: project.color || '#6b7280', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: project.color || '#6b7280' }}
                    />
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <span className="text-sm text-zinc-500 capitalize">{project.status}</span>
                    </div>
                  </div>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                    className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && !showForm && (
        <div className="text-center py-12 text-zinc-500">
          No projects yet. Create your first project to get started.
        </div>
      )}
    </div>
  )
}

