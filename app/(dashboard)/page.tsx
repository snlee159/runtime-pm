import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyPlan, Task, DailyCheckIn } from "@/lib/types";
import { PlanFailed } from "./plan-failed";
import { TodayPlan } from "./today-plan";
import { getLocalDateString } from "@/lib/date-utils";

async function getTodaysPlan(userId: string, dateOverride?: string) {
  const supabase = await createClient();
  const today = dateOverride || getLocalDateString();

  // Get today's check-in
  const { data: checkIn } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  // Get today's plan
  const { data: plan } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  // Return check-in even if no plan (for error handling)
  if (!plan) return { checkIn, plan: null, tasks: [] };

  // Get all tasks referenced in the plan (with their parent context)
  const taskIds = [
    plan.primary_focus_task_id,
    ...(plan.secondary_task_ids || []),
    ...(plan.multitask_task_ids || []),
  ].filter(Boolean);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, project:projects(*)")
    .in("id", taskIds);

  // For each task, also get its parent for context (with all sibling subtasks for progress)
  const tasksWithParents = await Promise.all(
    (tasks || []).map(async (task) => {
      if (task.parent_task_id) {
        const { data: parent } = await supabase
          .from("tasks")
          .select(
            `
            *,
            subtasks:tasks!parent_task_id(
              *,
              subtasks:tasks!parent_task_id(
                *,
                subtasks:tasks!parent_task_id(*)
              )
            )
          `
          )
          .eq("id", task.parent_task_id)
          .single();
        return { ...task, parent_task: parent };
      }
      return task;
    })
  );

  return {
    plan,
    checkIn,
    tasks: tasksWithParents,
  };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .single();

  // Redirect to onboarding if profile doesn't exist or onboarding not completed
  if (!profile || !profile.onboarding_completed) {
    redirect("/auth/onboarding");
  }

  // Get the date from search params (passed from client) or fallback to server's local date
  const params = await searchParams;
  const today = (params.date as string) || getLocalDateString();
  const planData = await getTodaysPlan(user.id, today);

  // Check if check-in exists
  if (!planData?.checkIn) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Good morning</h1>
          <p className="text-zinc-400">
            Let's start with a quick reality check
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <p className="text-lg mb-6 text-zinc-300">
            No plan yet for today. Start with your morning check-in.
          </p>
          <Link
            href="/checkin"
            className="inline-block px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Start Morning Check-In
          </Link>
        </div>
      </div>
    );
  }

  if (!planData?.plan) {
    // Check-in exists but no plan - plan generation likely failed
    if (planData?.checkIn) {
      return <PlanFailed />;
    }

    // No check-in and no plan
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Generating your plan...</h1>
          <p className="text-zinc-400">This should happen automatically</p>
        </div>
      </div>
    );
  }

  const { plan, tasks } = planData;

  return <TodayPlan plan={plan} tasks={tasks} today={today} />;
}
