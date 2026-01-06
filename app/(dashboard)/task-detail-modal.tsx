"use client";

import { Task } from "@/lib/types";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}

export function TaskDetailModal({
  task,
  onClose,
  onComplete,
}: TaskDetailModalProps) {
  const supabase = createClient();

  const handleComplete = async () => {
    const isCompleted = task.status === "complete";
    const newStatus = isCompleted ? "incomplete" : "complete";
    const newCompletedAt = isCompleted ? null : new Date().toISOString();

    // Recursively collect all subtask IDs
    const collectSubtaskIds = (t: Task): string[] => {
      const ids: string[] = [];
      if (t.subtasks && t.subtasks.length > 0) {
        for (const subtask of t.subtasks) {
          ids.push(subtask.id);
          ids.push(...collectSubtaskIds(subtask));
        }
      }
      return ids;
    };

    // Update the main task
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newCompletedAt,
      })
      .eq("id", task.id);

    if (!error) {
      // If marking as complete, also mark all subtasks as complete
      if (!isCompleted) {
        const subtaskIds = collectSubtaskIds(task);
        if (subtaskIds.length > 0) {
          await supabase
            .from("tasks")
            .update({
              status: "complete",
              completed_at: newCompletedAt,
            })
            .in("id", subtaskIds);
        }
      }

      // Auto-complete or uncomplete parent tasks
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { autoCompleteParentTasks, autoUncompleteParentTasks } =
          await import("@/lib/task-completion-utils");
        if (!isCompleted) {
          await autoCompleteParentTasks(supabase, task.id, user.id);
        } else {
          await autoUncompleteParentTasks(supabase, task.id, user.id);
        }
      }

      onComplete();
    } else {
      console.error("Error updating task:", error);
    }
  };

  // Calculate progress if task has subtasks
  const calculateProgress = (t: Task): { completed: number; total: number } => {
    if (!t.subtasks || t.subtasks.length === 0) {
      return {
        completed: t.status === "complete" ? 1 : 0,
        total: 1,
      };
    }

    let completed = 0;
    let total = 0;

    for (const subtask of t.subtasks) {
      const progress = calculateProgress(subtask);
      completed += progress.completed;
      total += progress.total;
    }

    return { completed, total };
  };

  const progress =
    task.subtasks && task.subtasks.length > 0 ? calculateProgress(task) : null;
  const progressPercent = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
            {task.parent_task && (
              <div className="text-sm text-zinc-500">
                Part of: {task.parent_task.title}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-2xl leading-none ml-4"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-zinc-300 whitespace-pre-line leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Parent Task Details */}
          {task.parent_task && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
                Parent Task
              </h3>
              <a
                href={`/tasks?expand=${task.parent_task.id}`}
                className="block bg-zinc-950 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="font-medium flex-1">
                    {task.parent_task.title}
                  </div>
                  <span className="text-xs text-zinc-500">View →</span>
                </div>
                {task.parent_task.description && (
                  <p className="text-sm text-zinc-400 mb-3">
                    {task.parent_task.description}
                  </p>
                )}

                {/* Parent Progress */}
                {task.parent_task.subtasks &&
                  task.parent_task.subtasks.length > 0 &&
                  (() => {
                    const parentProgress = calculateProgress(task.parent_task);
                    const parentPercent = Math.round(
                      (parentProgress.completed / parentProgress.total) * 100
                    );
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-500 transition-all duration-300"
                            style={{ width: `${parentPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 whitespace-nowrap">
                          {parentProgress.completed}/{parentProgress.total} done
                        </span>
                      </div>
                    );
                  })()}
              </a>
            </div>
          )}

          {/* Task Metadata */}
          <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Task Details
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">
                  Estimated Effort
                </div>
                <div className="text-lg font-medium">
                  {task.estimated_effort} minutes
                </div>
              </div>
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Energy Cost</div>
                <div className="text-lg font-medium capitalize">
                  {task.energy_cost}
                </div>
              </div>
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Focus Depth</div>
                <div className="text-lg font-medium capitalize">
                  {task.focus_depth}
                </div>
              </div>
              <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Context Type</div>
                <div className="text-lg font-medium capitalize">
                  {task.context_type}
                </div>
              </div>
            </div>

            {task.multitask_safe && (
              <div className="mt-3 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-400">
                ✓ Multitask-safe (can be done alongside other activities)
              </div>
            )}
          </div>

          {/* Project */}
          {task.project && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-2">
                Project
              </h3>
              <a
                href={`/tasks?project=${task.project.id}`}
                className="block px-4 py-3 rounded-lg border-l-4 hover:bg-zinc-950/50 transition-colors cursor-pointer"
                style={{
                  backgroundColor: "rgb(24, 24, 27)",
                  borderLeftColor: task.project.color || "#6b7280",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium flex-1">{task.project.name}</div>
                  <span className="text-xs text-zinc-500">View →</span>
                </div>
                {task.project.description && (
                  <div className="text-sm text-zinc-400 mt-1">
                    {task.project.description}
                  </div>
                )}
              </a>
            </div>
          )}

          {/* Subtasks Progress (if has subtasks) */}
          {progress && progress.total > 1 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
                Progress
              </h3>
              <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <div className="text-sm text-zinc-500">
                  {progressPercent}% complete
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Status
            </h3>
            <div className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg inline-block capitalize">
              {task.status}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-6 flex gap-3">
          <button
            onClick={handleComplete}
            className={`flex-1 py-3 text-white font-medium rounded-lg transition-colors cursor-pointer ${
              task.status === "complete"
                ? "bg-zinc-700 hover:bg-zinc-600"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {task.status === "complete"
              ? "Mark as Incomplete"
              : "Mark as Complete"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
