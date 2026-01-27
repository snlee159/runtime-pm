"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Task, DailyPlan } from "@/lib/types";
import { getLocalDateString } from "@/lib/date-utils";
import { dataAPI, wrapAPI } from "@/lib/api-secure";

export default function WrapPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [deferred, setDeferred] = useState<string[]>([]);
  const [dropped, setDropped] = useState<string[]>([]);
  const [actualEnergy, setActualEnergy] = useState("");
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatBroke, setWhatBroke] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = getLocalDateString();

    // Get today's plan using secure API
    const { data: planData } = await dataAPI.select("daily_plans", {
      filters: { eq: { date: today }, single: true },
    });

    if (!planData) {
      setLoading(false);
      return;
    }

    setPlan(planData);

    // Get all tasks in the plan
    const taskIds = [
      planData.primary_focus_task_id,
      ...(planData.secondary_task_ids || []),
      ...(planData.multitask_task_ids || []),
    ].filter(Boolean);

    if (taskIds.length > 0) {
      const { data: tasksData } = await dataAPI.select("tasks", {
        filters: { in: { id: taskIds } },
      });

      setTasks(tasksData || []);
    }
    
    setLoading(false);
  };

  const toggleTask = (
    taskId: string,
    category: "complete" | "deferred" | "dropped"
  ) => {
    // Remove from all categories first
    setCompleted(completed.filter((id) => id !== taskId));
    setDeferred(deferred.filter((id) => id !== taskId));
    setDropped(dropped.filter((id) => id !== taskId));

    // Add to selected category
    if (category === "complete") {
      setCompleted([...completed.filter((id) => id !== taskId), taskId]);
    } else if (category === "deferred") {
      setDeferred([...deferred.filter((id) => id !== taskId), taskId]);
    } else {
      setDropped([...dropped.filter((id) => id !== taskId), taskId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();

      // Save wrap using secure API
      const { error } = await wrapAPI.upsert({
        date: today,
        plan_id: plan?.id,
        tasks_completed: completed,
        tasks_deferred: deferred,
        tasks_dropped: dropped,
        actual_energy: actualEnergy || null,
        what_went_well: whatWentWell || null,
        what_broke: whatBroke || null,
      });

      if (!error) {
        // Update task statuses using secure API
        if (completed.length > 0) {
          // Note: Bulk update of multiple tasks - using data operations API
          for (const taskId of completed) {
            await dataAPI.update("tasks", {
              status: "complete",
              completed_at: new Date().toISOString(),
            }, { eq: { id: taskId } });
          }

          // Auto-complete parent tasks for each completed task
          const { autoCompleteParentTasks } = await import(
            "@/lib/task-completion-utils"
          );
          for (const taskId of completed) {
            // Note: task-completion-utils needs to be updated to use secure API
            // For now, using supabase directly for internal utilities
            await autoCompleteParentTasks(supabase, taskId, user.id);
          }
        }

        // Deferred and dropped tasks remain incomplete
        if (deferred.length > 0 || dropped.length > 0) {
          for (const taskId of [...deferred, ...dropped]) {
            await dataAPI.update("tasks", {
              status: "incomplete"
            }, { eq: { id: taskId } });
          }
        }

        const today = getLocalDateString();
        router.push(`/?date=${today}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Error submitting wrap:", error);
      alert("Failed to save wrap. Please try again.");
    }

    setSubmitting(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!plan) {
    const today = getLocalDateString();
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-4">No plan found for today</p>
          <button
            onClick={() => router.push(`/?date=${today}`)}
            className="px-6 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">End-of-Day Wrap</h1>
        <p className="text-zinc-400">Quick reflection on today's execution</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Task Outcomes */}
        <div>
          <h2 className="text-lg font-medium mb-4">
            What happened with today's tasks?
          </h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
              >
                <div className="mb-3">
                  <h3 className="font-medium mb-1">{task.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, "complete")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      completed.includes(task.id)
                        ? "bg-green-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    ✓ Done
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, "deferred")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      deferred.includes(task.id)
                        ? "bg-yellow-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    → Deferred
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, "dropped")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dropped.includes(task.id)
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    ✕ Dropped
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Energy Check */}
        <div>
          <label htmlFor="energy" className="block text-lg font-medium mb-3">
            How was your actual energy? (optional)
          </label>
          <input
            id="energy"
            type="text"
            value={actualEnergy}
            onChange={(e) => setActualEnergy(e.target.value)}
            placeholder="Better than expected / As planned / Lower than expected"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
        </div>

        {/* What went well */}
        <div>
          <label htmlFor="went-well" className="block text-lg font-medium mb-3">
            What went well? (optional)
          </label>
          <textarea
            id="went-well"
            value={whatWentWell}
            onChange={(e) => setWhatWentWell(e.target.value)}
            placeholder="Any wins or things that worked..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[80px]"
          />
        </div>

        {/* What broke */}
        <div>
          <label htmlFor="broke" className="block text-lg font-medium mb-3">
            What broke? (optional)
          </label>
          <textarea
            id="broke"
            value={whatBroke}
            onChange={(e) => setWhatBroke(e.target.value)}
            placeholder="Interruptions, energy crashes, planning errors..."
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[80px]"
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-white text-black font-medium text-lg rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Saving..." : "Complete Wrap"}
          </button>
        </div>
      </form>
    </div>
  );
}
