import {
  Task,
  DailyCheckIn,
  DailyPlan,
  EnergyLevel,
  EnergyCost,
  UserProfile,
} from "./types";

/**
 * Core Planning Engine
 *
 * This is the brain of Runtime PM. It translates reality constraints into execution decisions.
 *
 * Philosophy:
 * - Start from constraints, not goals
 * - Limit to one primary execution thread per day
 * - Penalize context switching
 * - Match task energy cost to available energy
 * - Explicitly decide what NOT to do
 *
 * TODO: This is a simple rule-based implementation.
 * Future: Layer in learned preferences, historical performance, adaptive planning
 */

interface PlanningInput {
  tasks: Task[];
  checkIn: DailyCheckIn;
  userProfile?: UserProfile;
}

interface PlanningOutput {
  primary_focus_task_id?: string;
  secondary_task_ids: string[];
  multitask_task_ids: string[];
  reasoning: string;
  estimated_total_effort: number;
  context_switches: number;
}

// Energy level to numeric score mapping
const ENERGY_SCORES: Record<EnergyLevel, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

const ENERGY_COST_SCORES: Record<EnergyCost, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * Filter tasks to only include those whose dependencies are completed
 *
 * A task can only be planned if all tasks it depends on are completed.
 */
function filterTasksByDependencies(tasks: Task[]): Task[] {
  const completedTaskIds = new Set(
    tasks.filter((t) => t.status === "complete").map((t) => t.id)
  );

  return tasks.filter((task) => {
    // If task has no dependencies, it's always available
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    const allDependenciesCompleted = task.dependencies.every((dep) =>
      completedTaskIds.has(dep.depends_on_task_id)
    );

    if (!allDependenciesCompleted) {
      console.log(
        `   ⏸️  Task "${task.title}" blocked by incomplete dependencies`
      );
    }

    return allDependenciesCompleted;
  });
}

/**
 * Main planning function
 */
export function generateDailyPlan(input: PlanningInput): PlanningOutput {
  console.log("🎯 Planning Engine: Starting");
  const { tasks, checkIn, userProfile } = input;
  const availableMinutes = checkIn.available_hours * 60;
  const energyScore = ENERGY_SCORES[checkIn.energy_level];
  const userPriorities = checkIn.priorities?.toLowerCase() || "";
  const userConstraints = checkIn.constraints?.toLowerCase() || "";

  console.log("   Available time:", availableMinutes, "minutes");
  console.log("   Energy score:", energyScore);
  console.log("   User priorities:", userPriorities ? "Yes" : "No");
  console.log("   User constraints:", userConstraints ? "Yes" : "No");
  console.log("   Total tasks to consider:", tasks.length);
  if (userProfile) {
    console.log("   User profile loaded:", {
      role: userProfile.role,
      planningStyle: userProfile.planning_style,
      peakEnergy: userProfile.peak_energy_time,
      contextTolerance: userProfile.context_switch_tolerance
    });
  }

  // Filter out tasks whose dependencies are not yet completed
  console.log("   Filtering for tasks with completed dependencies...");
  const tasksWithMetDependencies = filterTasksByDependencies(tasks);
  console.log(
    "   Tasks with met dependencies:",
    tasksWithMetDependencies.length
  );

  // Get LEAF tasks only (atomic tasks with no children)
  // These are the actual executable work units
  console.log("   Filtering for leaf tasks (no children)...");
  const allReadyTasks = tasksWithMetDependencies.filter(
    (t) => t.status === "incomplete"
  );

  // Find which tasks have children by checking ALL tasks (not just incomplete ones)
  // A task is a parent if any other task has it as parent_task_id
  const taskIdsWithChildren = new Set(
    tasks
      .filter((t) => t.parent_task_id) // Find all tasks that have a parent
      .map((t) => t.parent_task_id!) // Get their parent IDs
  );

  // Also check if task has subtasks property (if passed from query)
  const taskIdsWithSubtasks = new Set(
    allReadyTasks
      .filter((t) => (t as any).subtasks && (t as any).subtasks.length > 0)
      .map((t) => t.id)
  );

  // Combine both sets
  const allParentTaskIds = new Set([
    ...taskIdsWithChildren,
    ...taskIdsWithSubtasks,
  ]);

  // Leaf tasks = ready tasks with no children
  const leafTasks = allReadyTasks.filter((t) => !allParentTaskIds.has(t.id));

  console.log("   Ready tasks found:", allReadyTasks.length);
  console.log("   Parent tasks (have children):", allParentTaskIds.size);
  console.log("   Leaf tasks (plannable):", leafTasks.length);

  if (leafTasks.length === 0) {
    console.log(
      "   ⚠️  NO PLANNABLE TASKS: All tasks are either parents or have wrong status"
    );
    return {
      secondary_task_ids: [],
      multitask_task_ids: [],
      reasoning: "No tasks available for planning.",
      estimated_total_effort: 0,
      context_switches: 0,
    };
  }

  // Use leaf tasks directly (they already have correct effort estimates)
  const tasksWithRealEffort = leafTasks;

  // Separate multitask-safe tasks
  const multitaskTasks = tasksWithRealEffort.filter((t) => t.multitask_safe);
  const focusTasks = tasksWithRealEffort.filter((t) => !t.multitask_safe);

  console.log("   Focus tasks:", focusTasks.length);
  console.log("   Multitask tasks:", multitaskTasks.length);

  // Find primary focus task (considering user priorities, energy, and profile)
  console.log("   Selecting primary focus task...");
  const primaryTask = selectPrimaryFocus(
    focusTasks,
    energyScore,
    userPriorities,
    checkIn.energy_level,
    userProfile
  );

  if (primaryTask) {
    console.log("   ✅ Primary task selected:", primaryTask.title);
    if (userPriorities && matchesUserPriorities(primaryTask, userPriorities)) {
      console.log("   🎯 Primary task matches user priorities!");
    }
  } else {
    console.log("   ⚠️  No primary task selected");
  }

  // Calculate remaining capacity
  let remainingMinutes = availableMinutes;
  let remainingEnergy = energyScore;
  const selectedSecondaryIds: string[] = [];
  let contextSwitches = 0;

  if (primaryTask) {
    remainingMinutes -= primaryTask.estimated_effort;
    remainingEnergy -= ENERGY_COST_SCORES[primaryTask.energy_cost] * 0.5; // Primary task takes more energy
    contextSwitches = 0; // Primary task is the main thread
  }

  // Select secondary tasks (limited to avoid context switching)
  const secondaryTasks = selectSecondaryTasks(
    focusTasks.filter((t) => t.id !== primaryTask?.id),
    remainingMinutes,
    remainingEnergy,
    energyScore,
    userPriorities,
    checkIn.energy_level,
    userProfile
  );

  selectedSecondaryIds.push(...secondaryTasks.map((t) => t.id));
  contextSwitches += Math.max(0, secondaryTasks.length - 1); // Each additional task is a context switch

  if (secondaryTasks.length > 0) {
    console.log("   ✅ Secondary tasks selected:", secondaryTasks.length);
    const priorityMatches = secondaryTasks.filter(
      (t) => userPriorities && matchesUserPriorities(t, userPriorities)
    );
    if (priorityMatches.length > 0) {
      console.log(
        "   🎯",
        priorityMatches.length,
        "secondary task(s) match user priorities"
      );
    }
  }

  // Calculate used time
  const usedTime =
    (primaryTask?.estimated_effort || 0) +
    secondaryTasks.reduce((sum, t) => sum + t.estimated_effort, 0);

  // Select multitask tasks (can be done alongside)
  const multitaskIds = multitaskTasks
    .filter((t) => ENERGY_COST_SCORES[t.energy_cost] <= 1) // Only low-energy multitask tasks
    .slice(0, 3) // Limit to 3
    .map((t) => t.id);

  // Generate reasoning
  const reasoning = generateReasoning({
    primaryTask,
    secondaryTasks,
    multitaskCount: multitaskIds.length,
    energyLevel: checkIn.energy_level,
    availableHours: checkIn.available_hours,
    usedMinutes: usedTime,
    contextSwitches,
    priorities: checkIn.priorities,
    constraints: checkIn.constraints,
    userPriorities,
  });

  return {
    primary_focus_task_id: primaryTask?.id,
    secondary_task_ids: selectedSecondaryIds,
    multitask_task_ids: multitaskIds,
    reasoning,
    estimated_total_effort: usedTime,
    context_switches: contextSwitches,
  };
}

/**
 * Select the primary focus task
 *
 * Priority: User priorities > Energy matching > Focus depth > Task size > User preferences
 */
function selectPrimaryFocus(
  tasks: Task[],
  energyScore: number,
  userPriorities: string,
  energyLevel: EnergyLevel,
  userProfile?: UserProfile
): Task | null {
  if (tasks.length === 0) return null;

  // Score each task
  const scoredTasks = tasks.map((task) => {
    let score = 0;

    // User priorities boost - HIGHEST PRIORITY (trumps everything else)
    if (userPriorities && matchesUserPriorities(task, userPriorities)) {
      score += 50; // Massive boost for user-mentioned priorities
    }

    // Energy matching: prefer tasks that match our energy level
    const energyCost = ENERGY_COST_SCORES[task.energy_cost];
    const energyMatch = 5 - Math.abs(energyScore - energyCost);
    score += energyMatch * 4; // Weight energy matching heavily

    // Deep work bonus when energy is high
    if (task.focus_depth === "deep" && energyScore >= 4) {
      score += 8;
    }

    // Shallow work when energy is low
    if (task.focus_depth === "shallow" && energyScore <= 2) {
      score += 5;
    }

    // User profile-based preferences
    if (userProfile) {
      // Task duration preference
      const durationDiff = Math.abs(task.estimated_effort - userProfile.preferred_task_duration);
      if (durationDiff <= 15) { // Within 15 minutes of preferred
        score += 5;
      }

      // Planning style affects task selection
      if (userProfile.planning_style === 'aggressive') {
        // Favor larger tasks
        if (task.estimated_effort >= 90) score += 4;
      } else if (userProfile.planning_style === 'conservative') {
        // Favor smaller, manageable tasks
        if (task.estimated_effort <= 60) score += 4;
      }

      // Adjust for overcommitment tendency
      if (userProfile.overcommitment_tendency === 'high') {
        // Be more conservative, favor shorter tasks
        if (task.estimated_effort <= 45) score += 3;
      }
    } else {
      // Default behavior when no profile
      // Prefer larger tasks as primary focus (for flow state)
      if (task.estimated_effort >= 60) {
        score += 3;
      }
    }

    return { task, score };
  });

  // Sort by score and return top task
  scoredTasks.sort((a, b) => b.score - a.score);

  // Log top 3 candidates for debugging
  console.log("   Primary task candidates (top 3):");
  scoredTasks.slice(0, 3).forEach((item, i) => {
    const matchesPriority =
      userPriorities && matchesUserPriorities(item.task, userPriorities)
        ? " ⭐ PRIORITY MATCH"
        : "";
    console.log(
      `      ${i + 1}. "${item.task.title}" - Score: ${
        item.score
      }${matchesPriority}`
    );
  });

  return scoredTasks[0].task;
}

/**
 * Select secondary tasks
 *
 * Fill remaining time without excessive context switching
 * Priority: User priorities > Lower energy cost > Shorter duration > User preferences
 */
function selectSecondaryTasks(
  tasks: Task[],
  remainingMinutes: number,
  remainingEnergy: number,
  originalEnergy: number,
  userPriorities: string,
  energyLevel: EnergyLevel,
  userProfile?: UserProfile
): Task[] {
  const selected: Task[] = [];
  let usedMinutes = 0;

  // Limit secondary tasks based on user profile and energy
  let maxSecondaryTasks = originalEnergy >= 4 ? 2 : 1;
  
  if (userProfile) {
    // Adjust based on context switch tolerance
    if (userProfile.context_switch_tolerance === 'high') {
      maxSecondaryTasks += 1; // Can handle more tasks
    } else if (userProfile.context_switch_tolerance === 'low') {
      maxSecondaryTasks = Math.max(1, maxSecondaryTasks - 1); // Prefer fewer tasks
    }

    // Adjust based on multitasking comfort
    if (userProfile.multitasking_comfort === 'low') {
      maxSecondaryTasks = 1; // Stick to single focus
    }

    // Conservative planners should have fewer tasks
    if (userProfile.planning_style === 'conservative') {
      maxSecondaryTasks = Math.max(1, maxSecondaryTasks - 1);
    }
  }

  // Score and sort tasks (user priorities > lower energy > shorter duration)
  const sortedTasks = [...tasks]
    .map((task) => {
      let score = 0;
      const energyCost = ENERGY_COST_SCORES[task.energy_cost];

      // User priorities get massive boost
      if (userPriorities && matchesUserPriorities(task, userPriorities)) {
        score += 30; // High priority for user-mentioned tasks
      }

      // Prefer lower energy tasks for secondary slots
      score -= energyCost * 2; // Lower energy = higher score

      // Prefer shorter tasks to leave buffer
      if (task.estimated_effort <= 30) {
        score += 2;
      }

      return { task, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.task);

  console.log("   Secondary task candidates (top 5):");
  sortedTasks.slice(0, 5).forEach((task, i) => {
    const matchesPriority =
      userPriorities && matchesUserPriorities(task, userPriorities)
        ? " ⭐ PRIORITY MATCH"
        : "";
    console.log(
      `      ${i + 1}. "${task.title}" - ${task.estimated_effort}m, ${
        task.energy_cost
      }${matchesPriority}`
    );
  });

  for (const task of sortedTasks) {
    if (selected.length >= maxSecondaryTasks) break;
    if (usedMinutes + task.estimated_effort > remainingMinutes * 0.7) continue; // Don't overfill
    if (ENERGY_COST_SCORES[task.energy_cost] > remainingEnergy) continue;

    selected.push(task);
    usedMinutes += task.estimated_effort;
    remainingEnergy -= ENERGY_COST_SCORES[task.energy_cost] * 0.3;
  }

  return selected;
}

/**
 * Check if a task matches user priorities
 * Uses fuzzy matching to catch related terms
 */
function matchesUserPriorities(task: Task, priorities: string): boolean {
  const taskText = `${task.title} ${task.description || ""}`.toLowerCase();
  const projectText = task.project ? task.project.name.toLowerCase() : "";
  const combinedText = `${taskText} ${projectText}`;

  // Split priorities into phrases and words
  const priorityText = priorities.toLowerCase();

  // Extract meaningful words (longer than 3 chars, not common words)
  const commonWords = new Set([
    "want",
    "need",
    "should",
    "would",
    "could",
    "really",
    "very",
    "today",
    "work",
    "finish",
    "complete",
    "excited",
    "about",
  ]);
  const keywords = priorityText
    .split(/[\s,.\n;:]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 3 && !commonWords.has(k));

  // Check if any keyword appears in task or project
  const hasKeywordMatch = keywords.some((keyword) =>
    combinedText.includes(keyword)
  );

  // Also check for phrase matching (2+ words together)
  const phrases = priorityText
    .split(/[,.\n;]+/)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length >= 2); // Multi-word phrases only

  const hasPhraseMatch = phrases.some((phrase) =>
    combinedText.includes(phrase)
  );

  return hasKeywordMatch || hasPhraseMatch;
}

/**
 * Generate human-readable reasoning for the plan
 */
function generateReasoning(params: {
  primaryTask: Task | null;
  secondaryTasks: Task[];
  multitaskCount: number;
  energyLevel: EnergyLevel;
  availableHours: number;
  usedMinutes: number;
  contextSwitches: number;
  priorities?: string | null;
  constraints?: string | null;
  userPriorities: string;
}): string {
  const {
    primaryTask,
    secondaryTasks,
    multitaskCount,
    energyLevel,
    availableHours,
    usedMinutes,
    contextSwitches,
    priorities,
    constraints,
    userPriorities,
  } = params;

  const parts: string[] = [];

  // User priorities acknowledgment - BE SPECIFIC
  if (priorities && priorities.trim()) {
    const priorityTasksSelected: string[] = [];
    if (primaryTask && matchesUserPriorities(primaryTask, userPriorities)) {
      priorityTasksSelected.push(`primary task (${primaryTask.title})`);
    }
    const prioritySecondary = secondaryTasks.filter((t) =>
      matchesUserPriorities(t, userPriorities)
    );
    if (prioritySecondary.length > 0) {
      priorityTasksSelected.push(
        `${prioritySecondary.length} secondary task${
          prioritySecondary.length > 1 ? "s" : ""
        }`
      );
    }

    if (priorityTasksSelected.length > 0) {
      parts.push(
        `✓ Prioritizing what you're excited about: ${priorityTasksSelected.join(
          " and "
        )}.`
      );
    } else {
      parts.push(
        `Note: Your stated priorities ("${priorities.substring(
          0,
          50
        )}...") didn't match available tasks closely.`
      );
    }
  }

  // Constraints acknowledgment
  if (constraints && constraints.trim()) {
    parts.push(
      `Noted: ${constraints.substring(0, 80)}${
        constraints.length > 80 ? "..." : ""
      }`
    );
  }

  // Energy assessment - BE SPECIFIC
  if (energyLevel === "high" || energyLevel === "very_high") {
    if (primaryTask?.focus_depth === "deep") {
      parts.push(
        `Your ${energyLevel.replace(
          "_",
          " "
        )} energy is perfect for deep work on "${primaryTask.title}".`
      );
    } else {
      parts.push(
        `You have ${energyLevel.replace(
          "_",
          " "
        )} energy today - great for focused work!`
      );
    }
  } else if (energyLevel === "low" || energyLevel === "very_low") {
    parts.push(
      `Your energy is ${energyLevel.replace(
        "_",
        " "
      )} today, so I've chosen lighter tasks.`
    );
  } else {
    parts.push(`Your energy is ${energyLevel} - balanced mix of tasks.`);
  }

  // Primary focus
  if (primaryTask) {
    if (!priorities || !matchesUserPriorities(primaryTask, userPriorities)) {
      parts.push(
        `Primary focus: ${primaryTask.title} (${primaryTask.estimated_effort}m, ${primaryTask.energy_cost} energy).`
      );
    }
  } else {
    parts.push("No primary focus task selected.");
  }

  // Secondary tasks
  if (secondaryTasks.length > 0) {
    const names = secondaryTasks.map((t) => t.title).join(", ");
    parts.push(`Secondary: ${names}.`);
  }

  // Multitask tasks
  if (multitaskCount > 0) {
    parts.push(
      `${multitaskCount} low-effort task${
        multitaskCount > 1 ? "s" : ""
      } for downtime.`
    );
  }

  // Time allocation
  const usedHours = Math.round((usedMinutes / 60) * 10) / 10;
  const utilization = Math.round((usedMinutes / (availableHours * 60)) * 100);
  parts.push(
    `Time: ${usedHours}h/${availableHours}h (${utilization}% capacity).`
  );

  // Context switching warning
  if (contextSwitches > 2) {
    parts.push("⚠️ Watch out: multiple context switches.");
  }

  return parts.join(" ");
}

/**
 * Calculate weekly summary metrics
 */
export function calculateWeeklySummary(
  plans: DailyPlan[],
  wraps: any[],
  tasks: Task[]
): {
  total_tasks_completed: number;
  total_tasks_dropped: number;
  avg_context_switches: number;
  pace_assessment: "over_scoping" | "under_scoping" | "balanced";
  insights: string;
} {
  const totalCompleted = wraps.reduce(
    (sum, w) => sum + (w.tasks_completed?.length || 0),
    0
  );
  const totalDropped = wraps.reduce(
    (sum, w) => sum + (w.tasks_dropped?.length || 0),
    0
  );

  const avgContextSwitches =
    plans.length > 0
      ? plans.reduce((sum, p) => sum + p.context_switches, 0) / plans.length
      : 0;

  // Assess pacing
  let paceAssessment: "over_scoping" | "under_scoping" | "balanced" =
    "balanced";
  const completionRate = totalCompleted / (totalCompleted + totalDropped || 1);

  if (completionRate < 0.6) {
    paceAssessment = "over_scoping";
  } else if (completionRate > 0.9 && plans.length < 5) {
    paceAssessment = "under_scoping";
  }

  // Generate insights
  const insights: string[] = [];

  if (paceAssessment === "over_scoping") {
    insights.push("You're planning too much. Consider reducing daily scope.");
  } else if (paceAssessment === "under_scoping") {
    insights.push("You have more capacity. Consider taking on more.");
  }

  if (avgContextSwitches > 2) {
    insights.push(
      "High context switching detected. Try focusing on fewer tasks per day."
    );
  }

  if (totalCompleted === 0 && wraps.length > 0) {
    insights.push(
      "No tasks completed this week. Let's identify what's blocking progress."
    );
  }

  return {
    total_tasks_completed: totalCompleted,
    total_tasks_dropped: totalDropped,
    avg_context_switches: Math.round(avgContextSwitches * 10) / 10,
    pace_assessment: paceAssessment,
    insights: insights.join(" ") || "Keep up the good work.",
  };
}
