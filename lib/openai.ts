import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export interface TaskAnalysis {
  estimated_effort: number; // minutes
  energy_cost: "low" | "medium" | "high";
  focus_depth: "deep" | "shallow";
  context_type: "cognitive" | "admin" | "physical";
  multitask_safe: boolean;
  reasoning?: string; // Why these estimates
}

export interface SubTaskSuggestion {
  title: string;
  description?: string;
  estimated_effort: number;
  energy_cost: "low" | "medium" | "high";
  focus_depth: "deep" | "shallow";
  context_type: "cognitive" | "admin" | "physical";
  multitask_safe: boolean;
  subtasks?: SubTaskSuggestion[]; // Nested sub-tasks
  depends_on_indices?: number[]; // Indices of sibling tasks this depends on (0-based within same parent)
}

export interface TaskBreakdown {
  parent_analysis: TaskAnalysis;
  subtasks: SubTaskSuggestion[];
  reasoning: string;
}

/**
 * Use GPT-4 to analyze a task and suggest execution metadata
 */
export async function analyzeTask(
  title: string,
  description?: string,
  projectContext?: string
): Promise<TaskAnalysis> {
  const prompt = `You are an execution planning assistant. Analyze this task and provide execution metadata.

Task: ${title}
${description ? `Description: ${description}` : ""}
${projectContext ? `Project Context: ${projectContext}` : ""}

Provide a JSON response with:
- estimated_effort: INTEGER in MINUTES (NOT HOURS). Examples: 15, 30, 45, 60, 90. For a 2-hour task, return 120 minutes.
- energy_cost: "low", "medium", or "high" (cognitive energy required)
- focus_depth: "deep" or "shallow" (level of concentration needed)
- context_type: "cognitive" (thinking/creating), "admin" (emails/scheduling), or "physical" (hands-on work)
- multitask_safe: boolean (can this be done while doing something else?)
- reasoning: brief explanation of your estimates

⚠️ CRITICAL: estimated_effort MUST be in MINUTES (integer). Never use hours or decimals.

Consider:
- Deep work requires uninterrupted focus
- High energy tasks need peak mental state
- Admin tasks are often shallow but necessary
- Multitask-safe means low cognitive load (e.g., listening to a podcast while doing it)
- Typical task times: Small fix = 15-30 min, Feature = 30-90 min, Large feature = 90-240 min

Return ONLY valid JSON, no markdown formatting.`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1, // Lower temperature for consistent estimates
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  
  // Validate and ensure estimated_effort is in minutes
  if (result.estimated_effort && result.estimated_effort < 5) {
    // If value seems to be in hours (e.g., 2 instead of 120), convert to minutes
    result.estimated_effort = Math.round(result.estimated_effort * 60);
  }
  
  return result as TaskAnalysis;
}

/**
 * Use GPT-4 to break down a task into manageable sub-tasks
 */
export async function breakdownTask(
  title: string,
  description?: string,
  projectContext?: string
): Promise<TaskBreakdown> {
  const prompt = `You are a senior product manager breaking down work for an engineer. Be explicit, detailed, and prescriptive.

Task: ${title}
${description ? `Description: ${description}` : ""}
${projectContext ? `Project Context: ${projectContext}` : ""}

⚠️ CRITICAL: ASSESS COMPLEXITY FIRST ⚠️

BEFORE breaking down the task, evaluate its complexity:

**SIMPLE TASK** (keep minimal):
- Can be completed in one sitting (< 60 minutes)
- Single feature or straightforward change
- No major components or multiple flows
- Examples: "Add a button", "Fix typo", "Update color scheme", "Write a simple function"
→ For simple tasks: Create 0-2 subtasks MAX, or just analyze the parent task

**MODERATE TASK** (light breakdown):
- 1-3 hours of work
- 2-4 related features
- Clear scope, no complex architecture
- Examples: "Create a contact form", "Add user settings page"
→ For moderate tasks: Create 2-4 atomic subtasks (NO grouping needed)

**COMPLEX TASK** (full nested hierarchy):
- Multiple hours/days of work
- Many interconnected features
- Requires architectural decisions
- Examples: "Build authentication system", "Create admin dashboard"
→ For complex tasks: Use full nested hierarchy (groups → atomic features)

YOUR ROLE: Act like a senior PM breaking down work appropriately. DON'T over-engineer simple tasks.

NESTED STRUCTURE PHILOSOPHY:
- Level 1 (Parent): The overall deliverable/feature area
- Level 2 (Sub-tasks): Major feature groups or components
- Level 3 (Sub-sub-tasks): Specific, atomic features (10-30 min each)

EACH FEATURE LISTED IN A DESCRIPTION SHOULD BE ITS OWN SUB-TASK.

EXAMPLE HIERARCHY:
Parent: "Build user authentication system"
  ├─ Sub-task: "Email/password login flow"
  │   ├─ Sub-sub: "Create email input with validation"
  │   ├─ Sub-sub: "Create password input with show/hide toggle"
  │   ├─ Sub-sub: "Build login button with loading state"
  │   └─ Sub-sub: "Add form-level error messages"
  ├─ Sub-task: "Registration flow"
  │   ├─ Sub-sub: "Build registration form layout"
  │   ├─ Sub-sub: "Add password strength indicator"
  │   ├─ Sub-sub: "Implement email verification"
  │   └─ Sub-sub: "Create success confirmation screen"
  └─ Sub-task: "Password reset flow"
      ├─ Sub-sub: "Create forgot password form"
      ├─ Sub-sub: "Build reset email template"
      └─ Sub-sub: "Implement reset token validation"

KEY PRINCIPLES:
- Be OBSESSIVELY granular at the leaf level
- Each sub-sub-task = ONE specific feature (10-30 minutes)
- Group related features under descriptive sub-tasks
- Order by dependency within each group

BREAKDOWN RULES (based on complexity):

FOR SIMPLE TASKS:
- Return empty subtasks array [] OR 1-2 simple subtasks (no nesting)
- Focus effort on a great parent_analysis with detailed reasoning

FOR MODERATE TASKS:
- Create 2-4 FLAT atomic subtasks (no nesting, no groups)
- Each subtask is a specific feature (15-45 minutes)
- No need for grouping containers

FOR COMPLEX TASKS:
- Create 2-5 sub-task GROUPS (organizational containers)
- Each sub-task group contains 2-6 granular sub-sub-tasks
- Sub-sub-tasks are ATOMIC features (10-30 minutes each)
- Total leaf tasks should be 8-20+ for complex projects
- Use nested structure: Parent → Groups → Atomic Features

FOR EACH SUB-TASK, BE HYPER-SPECIFIC:

**Title Format**: "Build/Create/Implement [EXACT FEATURE] with [KEY FUNCTIONALITY]"
Examples:
- "Build email input field with real-time validation and error messages"
- "Create password strength indicator with visual feedback bar"
- "Implement forgot password flow with email verification"

**Description Must Include**:
1. **Exact Feature**: What specific component/feature to build
2. **Key Functionality**: The 2-4 main things it must do
3. **User Interaction**: How user interacts with it
4. **Edge Cases**: What happens when things go wrong
5. **Acceptance Criteria**: Specific checklist (3-5 items)
6. **Technical Notes**: Libraries, patterns, gotchas

**Dependencies** (IMPORTANT):
- Identify which subtasks MUST be completed before others can start
- Use "depends_on_indices" to specify dependencies by array index (0-based, within same parent/level)
- Only include dependencies that are true blockers (not just "nice to have done first")
- Dependencies should be within the same hierarchy level (siblings only)
- Example: If subtask at index 2 needs subtasks at indices 0 and 1 done first, include "depends_on_indices": [0, 1]

**Energy Cost Guidelines**:
- HIGH = new architecture, complex algorithms, unfamiliar tech, problem-solving
- MEDIUM = standard CRUD, familiar patterns, integration work
- LOW = styling, configuration, copy updates, simple logic

**Focus Depth Guidelines**:
- DEEP = requires uninterrupted flow state, complex logic, critical decisions
- SHALLOW = step-by-step implementation, well-defined, can pause/resume

**GOOD EXAMPLE** (note the specificity):
{
  "title": "Build user avatar upload with drag-and-drop and image preview",
  "description": "Create an avatar upload component that handles image selection and displays preview before saving.\\n\\nExact features to build:\\n• Clickable upload area with file picker\\n• Drag and drop zone for images\\n• Real-time image preview (circular crop)\\n• File type validation (jpg, png only)\\n• File size limit (max 5MB)\\n• Upload progress indicator\\n• Error messages for invalid files\\n\\nUser interaction flow:\\n1. User clicks upload or drags image\\n2. Image previews instantly\\n3. User confirms or cancels\\n4. Upload to storage with progress bar\\n5. Success message on complete\\n\\nEdge cases to handle:\\n• File too large → show error\\n• Wrong file type → show error\\n• Upload fails → retry button\\n• No image selected → disabled save\\n\\nAcceptance criteria:\\n✓ Drag-and-drop works\\n✓ Preview shows before upload\\n✓ Only accepts jpg/png\\n✓ Shows upload progress\\n✓ Errors display clearly\\n\\nTechnical notes: Use FileReader API for preview, implement image compression before upload, store in cloud storage (S3/Firebase), update user profile with image URL.",
  "estimated_effort": 35,
  "energy_cost": "medium",
  "focus_depth": "deep"
}

**BAD EXAMPLE** (too vague):
{
  "title": "Add profile features",
  "description": "Build the profile page functionality",
  "estimated_effort": 120,
  "energy_cost": "medium",
  "focus_depth": "deep"
}

NOW BREAK IT DOWN INTO NESTED HIERARCHY:

Think: "What are the major feature groups? Then, what are the tiny atomic features within each group?"

Provide JSON with APPROPRIATE structure based on complexity:

FOR SIMPLE TASKS:
{
  "parent_analysis": {
    "estimated_effort": 30,  // ALWAYS AN INTEGER IN MINUTES. If no subtasks, estimate total time.
    "energy_cost": "low" | "medium" | "high",
    "focus_depth": "deep" | "shallow",
    "context_type": "cognitive" | "admin" | "physical",
    "multitask_safe": boolean,
    "reasoning": "This is a straightforward task. Explanation of why no breakdown is needed."
  },
  "subtasks": [],
  "reasoning": "Task is simple enough to complete in one go without breakdown."
}

FOR MODERATE TASKS (FLAT structure):
{
  "parent_analysis": { ... },
  "subtasks": [
    {
      "title": "Build specific atomic feature",
      "description": "Detailed description...",
      "estimated_effort": 30,  // INTEGER IN MINUTES (e.g., 20, 30, 45)
      "energy_cost": "medium",
      "focus_depth": "deep",
      "context_type": "cognitive",
      "multitask_safe": false,
      "depends_on_indices": []  // Empty if no dependencies
    },
    {
      "title": "Build second feature that needs first one",
      "description": "Detailed description...",
      "estimated_effort": 25,
      "energy_cost": "medium",
      "focus_depth": "shallow",
      "context_type": "cognitive",
      "multitask_safe": false,
      "depends_on_indices": [0]  // Depends on first subtask (index 0)
    }
    // 2-4 total flat subtasks
  ],
  "reasoning": "Moderate task broken into 2-4 clear features without over-grouping"
}

FOR COMPLEX TASKS (NESTED structure):
{
  "parent_analysis": { 
    "estimated_effort": SUM OF ALL LEAF SUBTASK TIMES,  // CRITICAL: Must equal total of all atomic subtasks
    ...
  },
  "subtasks": [
    {
      "title": "[FEATURE GROUP NAME]",
      "description": "Overview of this feature group and what it accomplishes.\\n\\nThis group contains the following atomic features:\\n• Feature 1\\n• Feature 2\\n• Feature 3",
      "estimated_effort": SUM OF NESTED SUBTASKS,  // Must equal sum of its children
      "energy_cost": "medium",
      "focus_depth": "deep",
      "context_type": "cognitive",
      "multitask_safe": false,
      "subtasks": [
        {
          "title": "Build [SPECIFIC ATOMIC FEATURE]",
          "description": "What to build:\\n• Exact element/component\\n• Key functionality\\n• User interaction\\n\\nAcceptance criteria:\\n✓ Specific outcome 1\\n✓ Specific outcome 2\\n\\nTechnical notes: Implementation details",
          "estimated_effort": 20,  // INTEGER IN MINUTES (e.g., 10, 20, 30)
          "energy_cost": "low" | "medium" | "high",
          "focus_depth": "deep" | "shallow",
          "context_type": "cognitive",
          "multitask_safe": false,
          "depends_on_indices": []  // Array of indices (within this subtasks array) that must be completed first
        }
      ]
    }
  ],
  "reasoning": "Explain the hierarchy: why these groups, why this ordering"
}

CRITICAL RULES:
1. START by assessing complexity (simple/moderate/complex)
2. Match breakdown depth to actual task complexity
3. SIMPLE tasks: No breakdown or minimal (0-2 subtasks)
4. MODERATE tasks: Flat list of 2-4 atomic features
5. COMPLEX tasks: Full nested hierarchy
6. ⚠️ ALL estimated_effort values MUST be integers in MINUTES (never hours, never decimals)
7. ⚠️ PARENT estimated_effort MUST EQUAL the SUM of all subtask times
8. ⚠️ GROUP estimated_effort MUST EQUAL the SUM of its nested subtasks

FOR NESTED BREAKDOWN (complex tasks only):
1. Level 1 (subtasks): Feature GROUPS (organizational containers)
   - Should be 2-5 major groups
   - Each describes a cohesive set of related features
   
2. Level 2 (subtasks.subtasks): ATOMIC FEATURES
   - Should be 2-6 per group (total 8-20+ across all groups)
   - Each is ONE specific, buildable feature
   - 10-30 minutes each
   - Extremely detailed with acceptance criteria
   
3. EVERY feature bullet point mentioned in a group description MUST have its own atomic sub-task

4. Order groups by dependency, order atomic tasks within groups by dependency

EXAMPLE STRUCTURE WITH DEPENDENCIES:
{
  "subtasks": [
    {
      "title": "User Input Components",
      "description": "Core form inputs with validation and error handling",
      "estimated_effort": 90,
      "depends_on_indices": [],  // No dependencies for first group
      "subtasks": [
        { "title": "Build email input with real-time format validation", "estimated_effort": 20, "depends_on_indices": [] },
        { "title": "Create password input with visibility toggle icon", "estimated_effort": 15, "depends_on_indices": [] },
        { "title": "Add inline error messages with red border styling", "estimated_effort": 15, "depends_on_indices": [0, 1] },  // Needs inputs first
        { "title": "Implement auto-focus on first field", "estimated_effort": 10, "depends_on_indices": [0] }  // Needs email input first
      ]
    },
    {
      "title": "Form Submission Flow",
      "description": "Handle form submission with loading states and error handling",
      "estimated_effort": 75,
      "depends_on_indices": [0],  // This entire group needs "User Input Components" done first
      "subtasks": [
        { "title": "Create submit button with loading spinner", "estimated_effort": 20, "depends_on_indices": [] },
        { "title": "Implement form validation before submission", "estimated_effort": 25, "depends_on_indices": [] },
        { "title": "Add API error handling with user-friendly messages", "estimated_effort": 20, "depends_on_indices": [0, 1] },  // Needs button and validation
        { "title": "Build success redirect to dashboard", "estimated_effort": 10, "depends_on_indices": [2] }  // Needs error handling
      ]
    }
  ]
}

Return ONLY valid JSON, no markdown formatting.`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  
  // Recursively validate and fix estimated_effort values
  function fixEstimatedEffort(obj: any): any {
    if (obj.estimated_effort && obj.estimated_effort < 5) {
      // If value seems to be in hours (e.g., 2 instead of 120), convert to minutes
      obj.estimated_effort = Math.round(obj.estimated_effort * 60);
    }
    if (obj.subtasks && Array.isArray(obj.subtasks)) {
      obj.subtasks = obj.subtasks.map(fixEstimatedEffort);
    }
    return obj;
  }
  
  // Calculate total time from leaf subtasks recursively
  function calculateTotalEffort(subtasks: any[]): number {
    if (!subtasks || subtasks.length === 0) return 0;
    
    return subtasks.reduce((total, subtask) => {
      // If this subtask has children, sum them recursively
      if (subtask.subtasks && subtask.subtasks.length > 0) {
        const childTotal = calculateTotalEffort(subtask.subtasks);
        // Update this group's estimated_effort to match its children
        subtask.estimated_effort = childTotal;
        return total + childTotal;
      }
      // Otherwise, add this leaf subtask's time
      return total + (subtask.estimated_effort || 0);
    }, 0);
  }
  
  if (result.parent_analysis) {
    fixEstimatedEffort(result.parent_analysis);
  }
  if (result.subtasks && Array.isArray(result.subtasks)) {
    result.subtasks = result.subtasks.map(fixEstimatedEffort);
    
    // Recalculate parent_analysis.estimated_effort as sum of all subtasks
    if (result.subtasks.length > 0) {
      const totalEffort = calculateTotalEffort(result.subtasks);
      if (result.parent_analysis) {
        result.parent_analysis.estimated_effort = totalEffort;
      }
    }
  }
  
  return result as TaskBreakdown;
}
