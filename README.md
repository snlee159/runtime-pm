# Runtime PM - Automated Execution Manager

Your personal PM that makes execution decisions, not just stores tasks.

## What is Runtime PM?

Runtime PM is **not** a task manager, calendar, or generic productivity app. It's an automated execution manager that:

- Translates your priorities and real-world constraints into realistic daily execution plans
- Continuously adapts when reality changes
- Makes decisions about what to work on, defer, or drop
- Understands that energy fluctuates, plans break, and context switching is expensive

The system's value is in **decision-making**, not storage.

## Core Philosophy

### User provides:
- High-level projects/initiatives
- Tasks (lightweight, execution-focused)
- Daily constraints (energy, time, attention)

### System decides:
- What should be worked on today
- What should be deferred or dropped
- How scope should shrink or expand

**You never manually reschedule tasks.**

## Features (V1)

- ✅ **Projects** - High-level initiatives
- ✅ **Tasks** - Execution-focused with metadata (energy cost, focus depth, context type)
- ✅ **Morning Reality Check-in** - 60-second daily constraints input
- ✅ **Automated Daily Plan Generation** - Rule-based planning engine
- ✅ **Today View** - System-generated execution plan
- ✅ **End-of-Day Wrap** - Quick reflection and outcome tracking
- ✅ **Weekly Review** - Runtime-generated insights on pace and patterns

## Tech Stack

- **Frontend**: Next.js 16 (React) + Tailwind CSS
- **Backend/Auth/DB**: Supabase
- **Hosting**: Vercel
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account ([supabase.com](https://supabase.com))

### 1. Clone and Install

```bash
cd runtime-pm
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

In your Supabase project dashboard:
1. Go to SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the script

This will create:
- All necessary tables (projects, tasks, daily_checkins, daily_plans, daily_wraps, weekly_summaries)
- Row Level Security policies
- Indexes for performance

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. First Use

1. Sign up for an account
2. Create a project (optional)
3. Add some tasks
4. Do your morning check-in
5. System generates your daily plan
6. At end of day, complete the wrap
7. View weekly insights

## Key Design Decisions

### Why This Isn't a Todo List

- **No manual scheduling** - The system decides what you should work on
- **Reality-first** - Starts from constraints (energy, time) not goals
- **Single execution thread** - Limits to one primary focus per day
- **Context switching penalty** - Actively avoids excessive task switching
- **Explicit boundaries** - Tells you when to stop working

### Task Metadata

Each task tracks execution metadata used by the planning engine:

- `estimated_effort` - Time in minutes
- `energy_cost` - low, medium, high
- `focus_depth` - deep, shallow
- `context_type` - cognitive, admin, physical
- `multitask_safe` - Can be done alongside other activities

### Planning Engine Logic

The rule-based planning engine (`lib/planning-engine.ts`):

1. **Starts from constraints** - Available hours and energy level
2. **Matches energy** - High-energy tasks when you're energized
3. **Limits context switching** - Max 1-2 secondary tasks
4. **Reserves capacity** - Doesn't overfill your day
5. **Explicit reasoning** - Explains why this plan was generated

Future: Layer in learned preferences, historical performance, adaptive planning.

## Project Structure

```
runtime-pm/
├── app/
│   ├── (dashboard)/          # Main app pages (protected)
│   │   ├── page.tsx          # Today view
│   │   ├── checkin/          # Morning check-in
│   │   ├── projects/         # Projects CRUD
│   │   ├── tasks/            # Tasks CRUD
│   │   ├── wrap/             # End-of-day wrap
│   │   └── weekly/           # Weekly review
│   ├── auth/
│   │   └── login/            # Authentication
│   └── api/
│       └── generate-plan/    # Plan generation endpoint
├── lib/
│   ├── supabase/             # Supabase client utilities
│   ├── types.ts              # TypeScript types
│   └── planning-engine.ts    # Core planning logic
├── components/
│   └── navigation.tsx        # App navigation
└── supabase-schema.sql       # Database schema
```

## UI/UX Design

The interface is designed to feel like a **control panel**, not a planner:

- Dark, calm aesthetic (zinc color palette)
- Strong typography hierarchy
- Minimal color usage
- No dashboards full of numbers
- No motivational quotes or gamification
- No streaks or badges

**Goal**: Make users feel "This system understands reality and is on my side."

## What's NOT Included (By Design)

❌ Calendar integrations  
❌ Habit tracking  
❌ Notes / second brain  
❌ Social features  
❌ Team features  
❌ Gamification  
❌ Manual task scheduling  

## Future Enhancements

- AI-generated plan explanations and summaries
- Historical performance learning
- Adaptive planning based on user patterns
- Mobile app
- Stripe integration for payments

## Development

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

## Deploy

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The middleware will handle authentication redirects automatically.

## License

Private project.

## Philosophy

This is an **execution manager**, not a productivity system. It assumes:

- Plans break
- Energy fluctuates
- Context switching is expensive
- Most todo apps fail because they don't make decisions

Runtime PM makes decisions for you, continuously repairs your plan when reality changes, and explicitly tells you what NOT to do.

If at any point this starts to feel like a todo list, calendar, or habit tracker - we've lost the plot.
# runtime-pm
