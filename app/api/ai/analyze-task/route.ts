import { createClient } from '@/lib/supabase/server'
import { analyzeTask } from '@/lib/openai'
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

    // Get user profile for personalized analysis
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, work_style, typical_work_hours, preferred_task_duration, tools_used, primary_goals')
      .eq('user_id', user.id)
      .single()

    // Prepare user context for AI
    const userContext = userProfile ? {
      role: userProfile.role,
      work_style: userProfile.work_style,
      typical_work_hours: userProfile.typical_work_hours,
      preferred_task_duration: userProfile.preferred_task_duration,
      tools_used: userProfile.tools_used,
      primary_goals: userProfile.primary_goals,
    } : undefined

    // Analyze task with AI
    const analysis = await analyzeTask(title, description, projectContext, userContext)

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error('AI analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze task' },
      { status: 500 }
    )
  }
}

