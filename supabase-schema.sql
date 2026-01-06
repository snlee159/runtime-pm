-- Runtime PM Database Schema
-- This schema supports an automated execution PM that makes daily planning decisions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table: High-level initiatives
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table: Execution-focused actions with planning metadata
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Execution metadata (for planning engine)
  estimated_effort INTEGER DEFAULT 30, -- minutes
  energy_cost TEXT DEFAULT 'medium', -- low, medium, high
  focus_depth TEXT DEFAULT 'shallow', -- deep, shallow
  context_type TEXT DEFAULT 'cognitive', -- cognitive, admin, physical
  multitask_safe BOOLEAN DEFAULT false,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'incomplete', -- incomplete, complete
  completed_at TIMESTAMPTZ
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies: Tracks which tasks must be completed before others can start
CREATE TABLE task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The dependent task
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The task it depends on
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent circular dependencies and duplicate relationships
  UNIQUE(task_id, depends_on_task_id),
  -- Prevent a task from depending on itself
  CHECK (task_id != depends_on_task_id)
);

-- Daily check-ins: Morning reality check
CREATE TABLE daily_checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Reality constraints
  energy_level TEXT NOT NULL, -- very_low, low, medium, high, very_high
  available_hours DECIMAL(4,2) NOT NULL, -- e.g., 4.5 hours
  constraints TEXT, -- free-form notes about today's constraints
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Daily plans: System-generated execution plans
CREATE TABLE daily_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checkin_id UUID REFERENCES daily_checkins(id) ON DELETE CASCADE,
  
  -- Planning decisions
  primary_focus_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  secondary_task_ids UUID[], -- Array of task IDs
  multitask_task_ids UUID[], -- Array of multitask-safe task IDs
  
  -- Planning metadata
  reasoning TEXT, -- Why this plan was generated
  estimated_total_effort INTEGER, -- minutes
  context_switches INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Daily wraps: End-of-day feedback
CREATE TABLE daily_wraps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE,
  
  -- Outcome data
  tasks_completed UUID[],
  tasks_deferred UUID[],
  tasks_dropped UUID[],
  
  -- Feedback
  actual_energy TEXT, -- How energy actually was
  what_went_well TEXT,
  what_broke TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Weekly summaries: Runtime-generated insights
CREATE TABLE weekly_summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Calculated metrics
  total_tasks_completed INTEGER DEFAULT 0,
  total_tasks_dropped INTEGER DEFAULT 0,
  avg_context_switches DECIMAL(4,2),
  avg_energy_match DECIMAL(4,2), -- How well planned energy matched actual
  
  -- Insights (can be AI-generated or rule-based)
  pace_assessment TEXT, -- over_scoping, under_scoping, balanced
  insights TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, week_start_date)
);

-- Row Level Security (RLS) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_wraps ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Task dependencies policies
CREATE POLICY "Users can view own task dependencies" ON task_dependencies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own task dependencies" ON task_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );
CREATE POLICY "Users can update own task dependencies" ON task_dependencies
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own task dependencies" ON task_dependencies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_dependencies.task_id AND tasks.user_id = auth.uid())
  );

-- Daily check-ins policies
CREATE POLICY "Users can view own checkins" ON daily_checkins
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON daily_checkins
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily plans policies
CREATE POLICY "Users can view own plans" ON daily_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON daily_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON daily_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily wraps policies
CREATE POLICY "Users can view own wraps" ON daily_wraps
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wraps" ON daily_wraps
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wraps" ON daily_wraps
  FOR UPDATE USING (auth.uid() = user_id);

-- Weekly summaries policies
CREATE POLICY "Users can view own summaries" ON weekly_summaries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON weekly_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON weekly_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily inspirations table: AI-generated quote and tip, shared across all users
CREATE TABLE daily_inspirations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  motivational_quote TEXT NOT NULL,
  productivity_tip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for daily inspirations
ALTER TABLE daily_inspirations ENABLE ROW LEVEL SECURITY;

-- Daily inspirations policies (public read and write)
CREATE POLICY "Anyone can view daily inspirations" ON daily_inspirations
  FOR SELECT USING (true);
  
CREATE POLICY "Anyone can insert daily inspirations" ON daily_inspirations
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_daily_checkins_user_date ON daily_checkins(user_id, date);
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
CREATE INDEX idx_daily_wraps_user_date ON daily_wraps(user_id, date);
CREATE INDEX idx_weekly_summaries_user_week ON weekly_summaries(user_id, week_start_date);
CREATE INDEX idx_daily_inspirations_date ON daily_inspirations(date);

