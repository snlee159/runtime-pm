import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      instruction,
      currentPlan,
      availableTasks,
      checkIn,
      lockedTaskIds = [],
    } = await request.json();

    if (!instruction || !instruction.trim()) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    // Get user profile for personalized planning
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select(
        "role, work_style, planning_style, preferred_task_duration, context_switch_tolerance, overcommitment_tendency"
      )
      .eq("user_id", user.id)
      .single();

    // Build context for AI
    const availableMinutes = checkIn.available_hours * 60;

    // Format current plan
    const currentPlanText = formatCurrentPlan(
      currentPlan,
      availableTasks,
      lockedTaskIds
    );

    // Format available tasks
    const availableTasksText = formatAvailableTasks(
      availableTasks,
      currentPlan,
      lockedTaskIds
    );

    const userContextSection = userProfile
      ? `

USER PROFILE (consider when refining):
- Role: ${userProfile.role}
- Work Style: ${userProfile.work_style}
- Planning Style: ${userProfile.planning_style}
- Preferred Task Duration: ${userProfile.preferred_task_duration} minutes
- Context Switch Tolerance: ${userProfile.context_switch_tolerance}
- Overcommitment Tendency: ${userProfile.overcommitment_tendency}

⚠️ Adjust plan based on profile:
- If planning_style is "conservative", leave buffer time and don't pack the schedule
- If planning_style is "aggressive", can fit more tasks
- If context_switch_tolerance is "low", minimize number of different tasks
- If overcommitment_tendency is "high", be cautious about adding too much
- Break tasks into chunks matching preferred_task_duration when possible`
      : "";

    const prompt = `You are an AI assistant helping a user refine their daily work plan. The user has energy level "${
      checkIn.energy_level
    }" and ${
      checkIn.available_hours
    } hours (${availableMinutes} minutes) available today.

${checkIn.priorities ? `User's stated priorities: ${checkIn.priorities}` : ""}
${
  checkIn.constraints ? `User's constraints: ${checkIn.constraints}` : ""
}${userContextSection}

CURRENT PLAN:
${currentPlanText}

AVAILABLE TASKS (not currently in plan):
${availableTasksText}

USER INSTRUCTION:
"${instruction}"

Based on the user's instruction, suggest modifications to their plan. You can:
- Add tasks from the available tasks list
- Remove tasks from the current plan (except locked ones)
- Move tasks between Primary Focus, Secondary Tasks, and Multitask-Safe categories
- Adjust priorities and reasoning

LOCKED TASKS (cannot be removed or modified):
${
  lockedTaskIds.length > 0
    ? lockedTaskIds
        .map((id: string) => {
          const task = availableTasks.find((t: any) => t.id === id);
          return task ? `- ${task.title} (${task.id})` : "";
        })
        .join("\n")
    : "None"
}

Return a JSON response with:
{
  "primary_task_id": "task-id or null",
  "secondary_task_ids": ["task-id1", "task-id2"],
  "multitask_task_ids": ["task-id1", "task-id2"],
  "reasoning": "Brief explanation of the changes made based on user instruction",
  "changes_summary": "1-2 sentence summary of what changed"
}

RULES:
1. MUST preserve all locked tasks in the plan (keep them in their current category)
2. Total time should not exceed ${availableMinutes} minutes unless user explicitly asks for more
3. Respect task dependencies when possible (warn if adding tasks with incomplete dependencies)
4. Match energy cost to user's energy level when possible
5. Only use task IDs from the available tasks list or current plan
6. Be responsive to the user's instruction - if they say "add more", add more; if they say "remove", remove

Return ONLY valid JSON, no markdown formatting.`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    // Ensure locked tasks remain in the plan
    if (lockedTaskIds.length > 0) {
      const allPlanTaskIds = [
        result.primary_task_id,
        ...(result.secondary_task_ids || []),
        ...(result.multitask_task_ids || []),
      ].filter(Boolean);

      // Add any locked tasks that were removed
      for (const lockedId of lockedTaskIds) {
        if (!allPlanTaskIds.includes(lockedId)) {
          // Put it back where it was
          if (currentPlan.primaryTaskId === lockedId) {
            result.primary_task_id = lockedId;
          } else if (currentPlan.secondaryTaskIds.includes(lockedId)) {
            result.secondary_task_ids = [
              ...(result.secondary_task_ids || []),
              lockedId,
            ];
          } else if (currentPlan.multitaskTaskIds.includes(lockedId)) {
            result.multitask_task_ids = [
              ...(result.multitask_task_ids || []),
              lockedId,
            ];
          }
        }
      }
    }

    return NextResponse.json({ refinedPlan: result });
  } catch (error: any) {
    console.error("AI refinement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refine plan" },
      { status: 500 }
    );
  }
}

function formatCurrentPlan(
  currentPlan: any,
  allTasks: any[],
  lockedTaskIds: string[]
) {
  const lines: string[] = [];

  if (currentPlan.primaryTaskId) {
    const task = allTasks.find((t) => t.id === currentPlan.primaryTaskId);
    if (task) {
      const locked = lockedTaskIds.includes(task.id)
        ? " [LOCKED - COMPLETED]"
        : "";
      lines.push(
        `Primary Focus: ${task.title} (${task.estimated_effort}m, ${task.energy_cost} energy)${locked} [ID: ${task.id}]`
      );
    }
  } else {
    lines.push("Primary Focus: (none)");
  }

  if (currentPlan.secondaryTaskIds.length > 0) {
    lines.push("\nSecondary Tasks:");
    currentPlan.secondaryTaskIds.forEach((id: string) => {
      const task = allTasks.find((t) => t.id === id);
      if (task) {
        const locked = lockedTaskIds.includes(task.id)
          ? " [LOCKED - COMPLETED]"
          : "";
        lines.push(
          `- ${task.title} (${task.estimated_effort}m, ${task.energy_cost} energy)${locked} [ID: ${task.id}]`
        );
      }
    });
  } else {
    lines.push("\nSecondary Tasks: (none)");
  }

  if (currentPlan.multitaskTaskIds.length > 0) {
    lines.push("\nMultitask-Safe:");
    currentPlan.multitaskTaskIds.forEach((id: string) => {
      const task = allTasks.find((t) => t.id === id);
      if (task) {
        const locked = lockedTaskIds.includes(task.id)
          ? " [LOCKED - COMPLETED]"
          : "";
        lines.push(
          `- ${task.title} (${task.estimated_effort}m)${locked} [ID: ${task.id}]`
        );
      }
    });
  }

  return lines.join("\n");
}

function formatAvailableTasks(
  allTasks: any[],
  currentPlan: any,
  lockedTaskIds: string[]
) {
  const currentTaskIds = [
    currentPlan.primaryTaskId,
    ...currentPlan.secondaryTaskIds,
    ...currentPlan.multitaskTaskIds,
  ].filter(Boolean);

  const available = allTasks.filter(
    (t) =>
      !currentTaskIds.includes(t.id) &&
      !lockedTaskIds.includes(t.id) &&
      t.status === "incomplete"
  );

  if (available.length === 0) {
    return "No additional tasks available";
  }

  // Group by project
  const byProject = new Map<string, any[]>();
  available.forEach((task) => {
    const projectName = task.project?.name || "No Project";
    if (!byProject.has(projectName)) {
      byProject.set(projectName, []);
    }
    byProject.get(projectName)!.push(task);
  });

  const lines: string[] = [];
  byProject.forEach((tasks, projectName) => {
    lines.push(`\n${projectName}:`);
    tasks.forEach((task) => {
      const deps =
        task.dependencies?.length > 0
          ? ` [⚠️ ${task.dependencies.length} dependencies]`
          : "";
      lines.push(
        `- ${task.title} (${task.estimated_effort}m, ${task.energy_cost} energy, ${task.focus_depth} focus)${deps} [ID: ${task.id}]`
      );
    });
  });

  return lines.join("\n");
}
