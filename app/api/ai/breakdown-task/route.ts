import { createClient } from '@/lib/supabase/server'
import { breakdownTask } from '@/lib/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, project_id } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get project context if available
    let projectContext = ''
    if (project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, description')
        .eq('id', project_id)
        .single()
      
      if (project) {
        projectContext = `${project.name}${project.description ? ': ' + project.description : ''}`
      }
    }

    // Break down task with AI
    const breakdown = await breakdownTask(title, description, projectContext)

    return NextResponse.json({ breakdown })
  } catch (error: any) {
    console.error('AI breakdown error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to break down task' },
      { status: 500 }
    )
  }
}

