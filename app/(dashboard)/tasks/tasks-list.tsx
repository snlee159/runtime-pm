"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Task,
  Project,
  EnergyCost,
  FocusDepth,
  ContextType,
} from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/modal";

interface TasksListProps {
  initialTasks: Task[];
  projects: Project[];
}

// Calculate task completion progress recursively
function calculateProgress(task: Task): { completed: number; total: number } {
  if (!task.subtasks || task.subtasks.length === 0) {
    // Leaf task: count itself
    return {
      completed: task.status === "complete" ? 1 : 0,
      total: 1,
    };
  }

  // Parent task: aggregate all descendants
  let completed = 0;
  let total = 0;

  for (const subtask of task.subtasks) {
    const progress = calculateProgress(subtask);
    completed += progress.completed;
    total += progress.total;
  }

  return { completed, total };
}

// Edit form for parent tasks
function ParentTaskEditForm({
  task,
  onSave,
  onCancel,
  projects,
  allTasks,
}: {
  task: Task;
  onSave: (updates: Partial<Task>, dependencyIds: string[]) => void;
  onCancel: () => void;
  projects: Project[];
  allTasks: Task[];
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [projectId, setProjectId] = useState(task.project_id || "");
  const [estimatedEffort, setEstimatedEffort] = useState(
    task.estimated_effort?.toString() || "30"
  );
  const [energyCost, setEnergyCost] = useState<EnergyCost>(
    task.energy_cost || "medium"
  );
  const [focusDepth, setFocusDepth] = useState<FocusDepth>(
    task.focus_depth || "shallow"
  );
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    task.dependencies?.map((d) => d.depends_on_task_id) || []
  );
  const [dependencySearch, setDependencySearch] = useState("");

  // Filter out this task, completed tasks, and tasks in other projects
  const availableForDependencies = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      t.status !== "complete" &&
      (t.project_id === task.project_id || (!t.project_id && !task.project_id))
  );

  // Apply search filter
  const filteredDependencies = dependencySearch.trim()
    ? availableForDependencies.filter((t) =>
        t.title.toLowerCase().includes(dependencySearch.toLowerCase())
      )
    : availableForDependencies;

  return (
    <div className="p-5 bg-zinc-950/50">
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
          placeholder="Task title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
          placeholder="Description"
          rows={6}
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={estimatedEffort}
            onChange={(e) => setEstimatedEffort(e.target.value)}
            className="bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
            placeholder="Minutes"
          />
          <select
            value={energyCost}
            onChange={(e) => setEnergyCost(e.target.value as EnergyCost)}
            className="bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
          >
            <option value="low">Low Energy</option>
            <option value="medium">Medium Energy</option>
            <option value="high">High Energy</option>
          </select>
          <select
            value={focusDepth}
            onChange={(e) => setFocusDepth(e.target.value as FocusDepth)}
            className="bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
          >
            <option value="shallow">Shallow Focus</option>
            <option value="deep">Deep Focus</option>
          </select>
        </div>

        {/* Dependencies */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Dependencies (tasks that must be completed first)
          </label>
          {availableForDependencies.length > 0 && (
            <input
              type="text"
              value={dependencySearch}
              onChange={(e) => setDependencySearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-zinc-700"
            />
          )}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-3 max-h-40 overflow-y-auto">
            {availableForDependencies.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No other tasks in this project
              </p>
            ) : filteredDependencies.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No tasks match "{dependencySearch}"
              </p>
            ) : (
              filteredDependencies.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 py-1 hover:bg-zinc-800/50 px-2 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDependencies.includes(t.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newDeps = [...selectedDependencies, t.id];
                        console.log(
                          "Adding dependency:",
                          t.title,
                          "New deps:",
                          newDeps
                        );
                        setSelectedDependencies(newDeps);
                      } else {
                        const newDeps = selectedDependencies.filter(
                          (id) => id !== t.id
                        );
                        console.log(
                          "Removing dependency:",
                          t.title,
                          "New deps:",
                          newDeps
                        );
                        setSelectedDependencies(newDeps);
                      }
                    }}
                    className="rounded border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300">{t.title}</span>
                </label>
              ))
            )}
          </div>
          {selectedDependencies.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1">
              {selectedDependencies.length}{" "}
              {selectedDependencies.length === 1
                ? "dependency"
                : "dependencies"}{" "}
              selected
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log(
                "Saving parent task with dependencies:",
                selectedDependencies
              );
              onSave(
                {
                  title,
                  description,
                  project_id: projectId || undefined,
                  estimated_effort: parseInt(estimatedEffort),
                  energy_cost: energyCost,
                  focus_depth: focusDepth,
                },
                selectedDependencies
              );
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded cursor-pointer text-sm"
          >
            Save Changes
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded cursor-pointer text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Component for editing subtasks in the create modal
function SubtaskEditItem({
  subtask,
  index,
  onUpdate,
  onRemove,
  allSiblings = [],
}: {
  subtask: any;
  index: number;
  onUpdate: (id: string, updates: any) => void;
  onRemove: (id: string) => void;
  allSiblings?: any[];
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [dependencySearch, setDependencySearch] = useState("");
  const currentDependencies = subtask.depends_on_indices || [];
  const availableSiblings = allSiblings.filter((_, idx) => idx !== index);

  // Filter siblings based on search
  const filteredSiblings = availableSiblings.filter((sibling, siblingIndex) => {
    if (!dependencySearch.trim()) return true;
    const searchLower = dependencySearch.toLowerCase();
    const matchesTitle = sibling.title?.toLowerCase().includes(searchLower);
    const matchesDescription = sibling.description
      ?.toLowerCase()
      .includes(searchLower);
    return matchesTitle || matchesDescription;
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3">
      <div className="flex items-start gap-2">
        <span className="text-xs text-zinc-500 mt-2">{index + 1}.</span>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={subtask.title}
            onChange={(e) => onUpdate(subtask.id, { title: e.target.value })}
            placeholder="Subtask title"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
          />
          <textarea
            value={subtask.description || ""}
            onChange={(e) =>
              onUpdate(subtask.id, { description: e.target.value })
            }
            placeholder="Description (optional)"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
            rows={4}
          />
          <div className="grid grid-cols-4 gap-2">
            <input
              type="number"
              value={subtask.estimated_effort}
              onChange={(e) =>
                onUpdate(subtask.id, {
                  estimated_effort: parseInt(e.target.value),
                })
              }
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
              min="5"
              placeholder="Min"
            />
            <select
              value={subtask.energy_cost}
              onChange={(e) =>
                onUpdate(subtask.id, { energy_cost: e.target.value })
              }
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value="low">Low E</option>
              <option value="medium">Med E</option>
              <option value="high">High E</option>
            </select>
            <select
              value={subtask.focus_depth}
              onChange={(e) =>
                onUpdate(subtask.id, { focus_depth: e.target.value })
              }
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value="shallow">Shallow</option>
              <option value="deep">Deep</option>
            </select>
            <select
              value={subtask.context_type}
              onChange={(e) =>
                onUpdate(subtask.id, { context_type: e.target.value })
              }
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value="cognitive">Cog</option>
              <option value="admin">Admin</option>
              <option value="physical">Phys</option>
            </select>
          </div>

          {/* Additional Options for Subtasks */}
          <div className="border-t border-zinc-700 pt-2 mt-2">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors px-2 py-1.5 rounded bg-zinc-800/50 hover:bg-zinc-800 w-full"
            >
              <span>{showOptions ? "▼" : "▶"}</span>
              <span>Additional Options (Dependencies)</span>
              {currentDependencies.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-amber-900/50 text-amber-300 rounded text-xs font-semibold">
                  {currentDependencies.length} dep
                  {currentDependencies.length !== 1 ? "s" : ""}
                </span>
              )}
            </button>

            {showOptions && (
              <div className="mt-2 p-2 bg-zinc-950 border border-zinc-800 rounded">
                <label className="block text-xs font-medium mb-2 text-zinc-400">
                  Dependencies (sibling tasks that must be completed first)
                </label>
                {availableSiblings.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">
                    No other sibling tasks available
                  </p>
                ) : (
                  <>
                    <input
                      type="text"
                      value={dependencySearch}
                      onChange={(e) => setDependencySearch(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                    />
                    {filteredSiblings.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">
                        No matches for "{dependencySearch}"
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {allSiblings.map((sibling, siblingIndex) => {
                          if (siblingIndex === index) return null; // Skip self
                          // Check if this sibling matches the search filter
                          if (
                            !filteredSiblings.some((f) => f.id === sibling.id)
                          )
                            return null;
                          const isSelected =
                            currentDependencies.includes(siblingIndex);
                          return (
                            <label
                              key={sibling.id}
                              className="flex items-start gap-2 p-2 hover:bg-zinc-800/50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newDeps = e.target.checked
                                    ? [...currentDependencies, siblingIndex]
                                    : currentDependencies.filter(
                                        (idx: number) => idx !== siblingIndex
                                      );
                                  onUpdate(subtask.id, {
                                    depends_on_indices: newDeps,
                                  });
                                }}
                                className="mt-0.5 rounded border-zinc-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-zinc-300">
                                  #{siblingIndex + 1}: {sibling.title}
                                </div>
                                {sibling.description && (
                                  <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                    {sibling.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {subtask.subtasks && subtask.subtasks.length > 0 && (
            <div className="ml-4 pl-3 border-l-2 border-zinc-700 space-y-2">
              {subtask.subtasks.map((nested: any, nestedIndex: number) => (
                <SubtaskEditItem
                  key={nested.id}
                  subtask={nested}
                  index={nestedIndex}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  allSiblings={subtask.subtasks}
                />
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(subtask.id)}
          className="text-red-400 hover:text-red-300 text-sm p-1"
          title="Remove subtask"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Recursive component for displaying nested subtasks
function SubTaskDisplay({
  subtask,
  depth,
  onComplete,
  onDelete,
  onEdit,
  editingId,
  setEditingId,
  taskRefs,
  allTasks,
}: {
  subtask: Task;
  depth: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<Task>, dependencyIds: string[]) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  taskRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  allTasks: Task[];
}) {
  const [isExpanded, setIsExpanded] = useState(false); // Default collapsed
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [editDescription, setEditDescription] = useState(
    subtask.description || ""
  );
  const [editEffort, setEditEffort] = useState(
    subtask.estimated_effort?.toString() || "30"
  );
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    subtask.dependencies?.map((d) => d.depends_on_task_id) || []
  );
  const [dependencySearch, setDependencySearch] = useState("");

  const isEditing = editingId === subtask.id;
  const hasNested = subtask.subtasks && subtask.subtasks.length > 0;
  const indentClass = depth === 0 ? "" : "ml-4 border-l-2 border-zinc-700 pl-3";

  // Calculate progress for this subtask if it has children
  const progress = hasNested ? calculateProgress(subtask) : null;
  const progressPercent = progress
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  // Filter out this task, completed tasks, and tasks in other projects
  const availableForDependencies = allTasks.filter(
    (t) =>
      t.id !== subtask.id &&
      t.status !== "complete" &&
      (t.project_id === subtask.project_id ||
        (!t.project_id && !subtask.project_id))
  );

  // Apply search filter
  const filteredDependencies = dependencySearch.trim()
    ? availableForDependencies.filter((t) =>
        t.title.toLowerCase().includes(dependencySearch.toLowerCase())
      )
    : availableForDependencies;

  return (
    <div className={indentClass}>
      <div
        ref={(el) => {
          if (el && taskRefs) {
            taskRefs.current.set(subtask.id, el);
          }
        }}
        className="bg-zinc-900 rounded text-sm transition-all duration-300 overflow-hidden"
      >
        {isEditing ? (
          /* Edit mode */
          <div className="p-3 space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-sm"
              placeholder="Task title"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded text-xs"
              placeholder="Description"
              rows={4}
            />
            <input
              type="number"
              value={editEffort}
              onChange={(e) => setEditEffort(e.target.value)}
              className="w-24 bg-zinc-800 text-zinc-100 px-3 py-1 rounded text-xs"
              placeholder="Minutes"
            />

            {/* Dependencies */}
            <div>
              <label className="block text-xs font-medium mb-1 text-zinc-400">
                Dependencies (must be completed first)
              </label>
              {availableForDependencies.length > 0 && (
                <input
                  type="text"
                  value={dependencySearch}
                  onChange={(e) => setDependencySearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs mb-1 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                />
              )}
              <div className="bg-zinc-900 border border-zinc-800 rounded p-2 max-h-32 overflow-y-auto">
                {availableForDependencies.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No other tasks in project
                  </p>
                ) : filteredDependencies.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No matches for "{dependencySearch}"
                  </p>
                ) : (
                  filteredDependencies.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 py-1 hover:bg-zinc-800/50 px-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDependencies.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDependencies([
                              ...selectedDependencies,
                              t.id,
                            ]);
                          } else {
                            setSelectedDependencies(
                              selectedDependencies.filter((id) => id !== t.id)
                            );
                          }
                        }}
                        className="rounded border-zinc-700"
                      />
                      <span className="text-xs text-zinc-300 truncate">
                        {t.title}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedDependencies.length > 0 && (
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedDependencies.length} selected
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  console.log(
                    "Saving subtask with dependencies:",
                    selectedDependencies
                  );
                  onEdit(
                    subtask.id,
                    {
                      title: editTitle,
                      description: editDescription,
                      estimated_effort: parseInt(editEffort),
                    },
                    selectedDependencies
                  );
                }}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 rounded cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(null);
                }}
                className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display mode */
          <div className="flex items-start justify-between">
            {/* Clickable area to expand/collapse */}
            <div
              onClick={() => hasNested && setIsExpanded(!isExpanded)}
              className={`flex-1 p-3 ${
                hasNested ? "cursor-pointer hover:bg-zinc-900/50" : ""
              } ${subtask.status === "complete" ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {hasNested && (
                  <span className="text-zinc-500 text-xs">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                )}
                <div
                  className={`text-zinc-200 font-medium ${
                    subtask.status === "complete" ? "line-through" : ""
                  }`}
                >
                  {subtask.title}
                </div>
                {subtask.status === "complete" && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </div>
              {subtask.description && (
                <p className="text-xs text-zinc-400 whitespace-pre-line leading-relaxed mb-2">
                  {subtask.description}
                </p>
              )}

              {/* Progress bar for subtasks with children */}
              {hasNested && progress && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-400 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                </div>
              )}

              {!hasNested && (
                <div className="flex gap-2 mt-2">
                  <span className="text-xs text-zinc-500">
                    {subtask.estimated_effort}m
                  </span>
                  <span className="text-xs text-zinc-500">
                    {subtask.energy_cost}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {subtask.focus_depth}
                  </span>
                </div>
              )}

              {/* Dependencies Display */}
              {subtask.dependencies && subtask.dependencies.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <div className="text-xs font-medium text-zinc-400 mb-1">
                    🔗 Depends on:
                  </div>
                  <div className="space-y-1">
                    {subtask.dependencies.map((dep) => {
                      const depTask = allTasks.find(
                        (t) => t.id === dep.depends_on_task_id
                      );
                      if (!depTask) return null;
                      return (
                        <div
                          key={dep.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={
                              depTask.status === "complete"
                                ? "text-green-500"
                                : "text-yellow-500"
                            }
                          >
                            {depTask.status === "complete" ? "✓" : "⏸"}
                          </span>
                          <span
                            className={`${
                              depTask.status === "complete"
                                ? "text-zinc-500 line-through"
                                : "text-zinc-300"
                            }`}
                          >
                            {depTask.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons - not part of clickable area */}
            <div className="flex gap-1 ml-3 p-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(subtask.id);
                }}
                className="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 hover:bg-blue-900 rounded transition-colors cursor-pointer"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={() => onComplete(subtask.id)}
                className={`px-2 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer ${
                  subtask.status === "complete"
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                }`}
                title={
                  subtask.status === "complete"
                    ? "Mark incomplete"
                    : "Mark complete"
                }
              >
                ✓
              </button>
              <button
                onClick={() => onDelete(subtask.id)}
                className="px-2 py-1 text-xs bg-red-900/50 text-red-300 hover:bg-red-900 rounded transition-colors cursor-pointer"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nested subtasks */}
      {hasNested && isExpanded && (
        <div className="mt-2 space-y-2">
          {subtask.subtasks!.map((nested: Task) => (
            <SubTaskDisplay
              key={nested.id}
              subtask={nested}
              depth={depth + 1}
              onComplete={onComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              editingId={editingId}
              setEditingId={setEditingId}
              taskRefs={taskRefs}
              allTasks={allTasks}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TasksList({
  initialTasks,
  projects: initialProjects,
}: TasksListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [projects, setProjects] = useState(initialProjects);
  const [allTasksFlat, setAllTasksFlat] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    new Set() // Start with all tasks collapsed
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set() // Start with all projects collapsed
  );
  const [showCompletedInProject, setShowCompletedInProject] = useState<
    Set<string>
  >(
    new Set() // Track which projects show completed tasks
  );
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectColor, setEditingProjectColor] =
    useState<string>("#3b82f6");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const taskRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const projectRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    const projectId = task.project_id || "no-project";
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  // Get project info for each group with progress calculation
  // Include all projects (even those without tasks)
  const projectGroups: Array<{
    project: any;
    tasks: Task[];
    progress: { completed: number; total: number };
  }> = [];

  // Add projects with tasks
  Object.entries(tasksByProject).forEach(([projectId, tasks]) => {
    const project =
      projectId === "no-project"
        ? {
            id: "no-project",
            name: "No Project",
            color: "#6b7280",
            description: "Tasks without a project",
          }
        : projects.find((p) => p.id === projectId) || {
            id: projectId,
            name: "Unknown Project",
            color: "#6b7280",
          };

    // Calculate project progress based on completed tasks
    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    const totalTasks = tasks.length;
    const progress = { completed: completedTasks, total: totalTasks };

    projectGroups.push({ project, tasks, progress });
  });

  // Add projects without any tasks
  projects.forEach((project) => {
    if (!tasksByProject[project.id]) {
      projectGroups.push({
        project,
        tasks: [],
        progress: { completed: 0, total: 0 },
      });
    }
  });

  // Sort project groups by display_order
  projectGroups.sort((a, b) => {
    const orderA = (a.project as any).display_order ?? 999999;
    const orderB = (b.project as any).display_order ?? 999999;
    return orderA - orderB;
  });

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleCompletedInProject = (projectId: string) => {
    setShowCompletedInProject((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Handle URL parameters for expanding and scrolling to specific items
  useEffect(() => {
    const expandTaskId = searchParams.get("expand");
    const projectId = searchParams.get("project");

    if (expandTaskId) {
      // Recursively search for a task in the nested structure
      const findTaskRecursive = (
        taskList: Task[],
        targetId: string
      ): { task: Task | null; parents: string[] } => {
        for (const task of taskList) {
          if (task.id === targetId) {
            return { task, parents: [] };
          }
          if (task.subtasks && task.subtasks.length > 0) {
            const result = findTaskRecursive(task.subtasks, targetId);
            if (result.task) {
              return {
                task: result.task,
                parents: [task.id, ...result.parents],
              };
            }
          }
        }
        return { task: null, parents: [] };
      };

      // Find the task and its parent chain
      const { task, parents } = findTaskRecursive(tasks, expandTaskId);

      if (task) {
        // Expand the project if it exists
        if (task.project_id) {
          setExpandedProjects((prev) => new Set(prev).add(task.project_id!));
        }

        // Expand all parent tasks in the chain
        setExpandedTasks((prev) => {
          const newSet = new Set(prev);
          parents.forEach((id) => newSet.add(id));
          // Also expand the task itself if it has children
          if (task.subtasks && task.subtasks.length > 0) {
            newSet.add(expandTaskId);
          }
          return newSet;
        });

        // Scroll to the task after a short delay to allow rendering
        setTimeout(() => {
          const element = taskRefs.current.get(expandTaskId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Add a highlight effect
            element.classList.add("ring-2", "ring-blue-500");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-blue-500");
            }, 2000);
          }
        }, 300);
      }
    } else if (projectId) {
      // Expand the project
      setExpandedProjects((prev) => new Set(prev).add(projectId));

      // Scroll to the project after a short delay
      setTimeout(() => {
        const element = projectRefs.current.get(projectId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // Add a highlight effect
          element.classList.add("ring-2", "ring-blue-500");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-blue-500");
          }, 2000);
        }
      }, 300);
    }
  }, [searchParams, tasks]);

  // Task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [estimatedEffort, setEstimatedEffort] = useState("30");
  const [energyCost, setEnergyCost] = useState<EnergyCost>("medium");
  const [focusDepth, setFocusDepth] = useState<FocusDepth>("shallow");
  const [contextType, setContextType] = useState<ContextType>("cognitive");
  const [multitaskSafe, setMultitaskSafe] = useState(false);
  const [analyzingTask, setAnalyzingTask] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiSubtasks, setAiSubtasks] = useState<any[]>([]);
  const [aiReasoning, setAiReasoning] = useState("");
  const [taskDependencyIds, setTaskDependencyIds] = useState<string[]>([]);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [taskDependencySearch, setTaskDependencySearch] = useState("");

  // Recalculate parent task effort when subtasks change
  useEffect(() => {
    if (aiSubtasks.length > 0) {
      const calculateTotalEffort = (subtasks: any[]): number => {
        return subtasks.reduce((total, subtask) => {
          if (subtask.subtasks && subtask.subtasks.length > 0) {
            return total + calculateTotalEffort(subtask.subtasks);
          }
          return total + (subtask.estimated_effort || 0);
        }, 0);
      };

      const totalEffort = calculateTotalEffort(aiSubtasks);
      setEstimatedEffort(totalEffort.toString());
    }
  }, [aiSubtasks]);

  // Helper functions for subtask management
  const updateSubtask = (id: string, updates: any) => {
    const updateRecursive = (tasks: any[]): any[] => {
      return tasks.map((st) => {
        if (st.id === id) {
          return { ...st, ...updates };
        }
        if (st.subtasks) {
          return { ...st, subtasks: updateRecursive(st.subtasks) };
        }
        return st;
      });
    };
    setAiSubtasks(updateRecursive(aiSubtasks));
  };

  const removeSubtask = (id: string) => {
    const removeRecursive = (tasks: any[]): any[] => {
      return tasks
        .filter((st) => st.id !== id)
        .map((st) => ({
          ...st,
          subtasks: st.subtasks ? removeRecursive(st.subtasks) : undefined,
        }));
    };
    setAiSubtasks(removeRecursive(aiSubtasks));
  };

  const addSubtask = () => {
    setAiSubtasks([
      ...aiSubtasks,
      {
        id: `temp-${Date.now()}`,
        title: "",
        description: "",
        estimated_effort: 30,
        energy_cost: "medium",
        focus_depth: "shallow",
        context_type: "cognitive",
        multitask_safe: false,
      },
    ]);
  };

  // Project form state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectColor, setProjectColor] = useState("#3b82f6");

  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Flatten tasks for dependency selection (convert tree to flat list)
  useEffect(() => {
    const flattenTasks = (taskList: Task[]): Task[] => {
      const flat: Task[] = [];
      const flatten = (t: Task) => {
        flat.push(t);
        if (t.subtasks) {
          t.subtasks.forEach(flatten);
        }
      };
      taskList.forEach(flatten);
      return flat;
    };
    setAllTasksFlat(flattenTasks(tasks));
  }, [tasks]);

  const PROJECT_COLORS = [
    { name: "Gray", value: "#6b7280" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Orange", value: "#f59e0b" },
    { name: "Pink", value: "#ec4899" },
    { name: "Red", value: "#ef4444" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Indigo", value: "#6366f1" },
  ];

  const analyzeTaskWithAI = async () => {
    if (!title.trim()) {
      return;
    }

    setAnalyzingTask(true);

    try {
      const response = await fetch("/api/ai/breakdown-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          project_id: projectId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("AI analysis failed");
      }

      const { breakdown } = await response.json();

      // Update form with AI-generated values from parent analysis
      setEstimatedEffort(breakdown.parent_analysis.estimated_effort.toString());
      setEnergyCost(breakdown.parent_analysis.energy_cost);
      setFocusDepth(breakdown.parent_analysis.focus_depth);
      setContextType(breakdown.parent_analysis.context_type);
      setMultitaskSafe(breakdown.parent_analysis.multitask_safe);

      // Store subtasks and reasoning for later creation
      // Add unique IDs to subtasks for editing
      const addIdsToSubtasks = (tasks: any[], prefix = ""): any[] => {
        return tasks.map((st, index) => ({
          ...st,
          id: `temp-${Date.now()}-${prefix}${index}`,
          subtasks: st.subtasks
            ? addIdsToSubtasks(st.subtasks, `${prefix}${index}-`)
            : undefined,
        }));
      };
      setAiSubtasks(
        breakdown.subtasks ? addIdsToSubtasks(breakdown.subtasks) : []
      );
      setAiReasoning(breakdown.reasoning || "");
      setAiAnalyzed(true);
    } catch (err: any) {
      console.error("AI analysis error:", err);
    } finally {
      setAnalyzingTask(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Create parent task
      const { data: parentTask, error: parentError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title,
          description: description || undefined,
          project_id: projectId || undefined,
          estimated_effort: parseInt(estimatedEffort),
          energy_cost: energyCost,
          focus_depth: focusDepth,
          context_type: contextType,
          multitask_safe: multitaskSafe,
          status: "incomplete",
          ai_generated: aiSubtasks.length > 0,
          ai_metadata: aiReasoning ? { reasoning: aiReasoning } : null,
        })
        .select("*, project:projects(*)")
        .single();

      if (parentError) throw parentError;

      // Create sub-tasks recursively if any from AI analysis
      if (aiSubtasks.length > 0 && parentTask) {
        // Track mapping of temporary IDs to real database IDs for dependency creation
        const tempIdToRealId: Map<string, string> = new Map();
        const dependenciesToCreate: Array<{
          taskId: string;
          dependsOnId: string;
        }> = [];

        const insertSubtasksRecursively = async (
          subtasksData: any[],
          parentId: string,
          depth: number = 1
        ): Promise<void> => {
          // Filter out any empty or invalid subtasks
          const validSubtasks = subtasksData.filter(
            (st) => st.title && st.title.trim()
          );

          if (validSubtasks.length === 0) return;

          const subtaskInserts = validSubtasks.map((st, index) => ({
            user_id: user.id,
            parent_task_id: parentId,
            project_id: projectId || undefined,
            title: st.title,
            description: st.description || undefined,
            estimated_effort: st.estimated_effort,
            energy_cost: st.energy_cost,
            focus_depth: st.focus_depth,
            context_type: st.context_type,
            multitask_safe: st.multitask_safe || false,
            status: "incomplete",
            display_order: index,
            depth_level: depth,
            ai_generated: true,
          }));

          const { data: createdSubtasks, error: subtasksError } = await supabase
            .from("tasks")
            .insert(subtaskInserts)
            .select();

          if (subtasksError) throw subtasksError;

          // Map temporary IDs to real database IDs
          if (createdSubtasks) {
            for (let i = 0; i < validSubtasks.length; i++) {
              tempIdToRealId.set(validSubtasks[i].id, createdSubtasks[i].id);

              // Record dependencies to create later (using indices within this level)
              if (
                validSubtasks[i].depends_on_indices &&
                validSubtasks[i].depends_on_indices.length > 0
              ) {
                for (const depIndex of validSubtasks[i].depends_on_indices) {
                  if (depIndex >= 0 && depIndex < validSubtasks.length) {
                    dependenciesToCreate.push({
                      taskId: createdSubtasks[i].id,
                      dependsOnId: createdSubtasks[depIndex].id,
                    });
                  }
                }
              }

              // Handle nested subtasks
              if (
                validSubtasks[i].subtasks &&
                validSubtasks[i].subtasks.length > 0
              ) {
                await insertSubtasksRecursively(
                  validSubtasks[i].subtasks,
                  createdSubtasks[i].id,
                  depth + 1
                );
              }
            }
          }
        };

        await insertSubtasksRecursively(aiSubtasks, parentTask.id);

        // Create all subtask dependencies after all tasks are created
        if (dependenciesToCreate.length > 0) {
          const dependencyInserts = dependenciesToCreate.map((dep) => ({
            task_id: dep.taskId,
            depends_on_task_id: dep.dependsOnId,
          }));

          const { error: depsError } = await supabase
            .from("task_dependencies")
            .insert(dependencyInserts);

          if (depsError) {
            console.error("Failed to create subtask dependencies:", depsError);
            // Don't throw - dependencies are nice to have but not critical
          }
        }
      }

      // Create parent task dependencies
      if (taskDependencyIds.length > 0 && parentTask) {
        const dependencyInserts = taskDependencyIds.map((depId) => ({
          task_id: parentTask.id,
          depends_on_task_id: depId,
        }));

        const { error: depsError } = await supabase
          .from("task_dependencies")
          .insert(dependencyInserts);

        if (depsError) {
          console.error("Failed to create task dependencies:", depsError);
          // Don't throw - dependencies are nice to have but not critical
        }
      }

      // Refetch tasks to update the UI
      const { data: freshTasks } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .eq("user_id", user.id)
        .is("parent_task_id", null)
        .in("status", ["incomplete", "complete"])
        .order("created_at", { ascending: false });

      if (freshTasks) {
        // Fetch all subtasks recursively
        const taskIds = freshTasks.map((t) => t.id);
        const allSubtasks = await fetchSubtasksRecursive(taskIds);

        const tasksWithSubtasks = freshTasks.map((task) => ({
          ...task,
          subtasks: allSubtasks.filter((st) => st.parent_task_id === task.id),
        }));

        setTasks(tasksWithSubtasks);
      }

      // Close modal and reset form
      resetTaskForm();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get the highest display_order for this user's projects
    const maxOrder = projects.reduce(
      (max, p) => Math.max(max, p.display_order ?? 0),
      0
    );

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: projectName,
        description: projectDescription || undefined,
        color: projectColor,
        status: "active",
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (!error && data) {
      setProjects([...projects, data]);
      resetProjectForm();
      router.refresh();
    }

    setLoading(false);
  };

  const resetTaskForm = () => {
    setTitle("");
    setDescription("");
    setProjectId("");
    setEstimatedEffort("30");
    setEnergyCost("medium");
    setFocusDepth("shallow");
    setContextType("cognitive");
    setMultitaskSafe(false);
    setAiAnalyzed(false);
    setAiSubtasks([]);
    setAiReasoning("");
    setTaskDependencyIds([]);
    setShowTaskOptions(false);
    setTaskDependencySearch("");
    setShowTaskModal(false);
  };

  const resetProjectForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectColor("#3b82f6");
    setShowProjectModal(false);
  };

  const handleEditProject = async (
    projectId: string,
    updates: { name: string; description: string; color: string }
  ) => {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId);

    if (!error) {
      setProjects(
        projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
      );
      setEditingProjectId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this project? Tasks in this project will be moved to "No Project".'
      )
    ) {
      return;
    }

    // First, update all tasks in this project to have no project
    await supabase
      .from("tasks")
      .update({ project_id: null })
      .eq("project_id", projectId);

    // Then delete the project
    const { error } = await supabase
      .from("projects")
      .update({ status: "deleted" })
      .eq("id", projectId);

    if (!error) {
      setProjects(projects.filter((p) => p.id !== projectId));
      // Refresh tasks to update their project assignment
      router.refresh();
    }
  };

  // Recursively fetch subtasks
  const fetchSubtasksRecursive = async (
    parentIds: string[]
  ): Promise<Task[]> => {
    if (parentIds.length === 0) return [];

    const { data: subtasks } = await supabase
      .from("tasks")
      .select("*")
      .in("parent_task_id", parentIds)
      .in("status", ["incomplete", "complete"])
      .order("display_order", { ascending: true });

    if (!subtasks || subtasks.length === 0) return [];

    // Load nested subtasks for these subtasks
    const nestedIds = subtasks.map((st) => st.id);
    const nestedSubtasks = await fetchSubtasksRecursive(nestedIds);

    // Attach nested subtasks to their parents
    return subtasks.map((st) => ({
      ...st,
      subtasks: nestedSubtasks.filter((nst) => nst.parent_task_id === st.id),
    }));
  };

  const handleEditTask = async (
    taskId: string,
    updates: Partial<Task>,
    dependencyIds?: string[]
  ) => {
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      console.error("Failed to update task:", error);
      return;
    }

    // Update dependencies if provided
    if (dependencyIds !== undefined) {
      console.log(
        "Updating dependencies for task:",
        taskId,
        "Dependencies:",
        dependencyIds
      );

      // Delete existing dependencies
      const { data: deleteData, error: deleteError } = await supabase
        .from("task_dependencies")
        .delete()
        .eq("task_id", taskId);

      // Supabase sometimes returns an empty {} as error, which is not a real error
      // Only treat it as an error if it has actual error properties with values
      if (deleteError && Object.keys(deleteError).length > 0) {
        const errorMessage =
          deleteError.message ||
          deleteError.code ||
          JSON.stringify(deleteError);
        if (errorMessage && errorMessage !== "{}") {
          console.error("Failed to delete existing dependencies:", deleteError);
          throw new Error(`Failed to delete dependencies: ${errorMessage}`);
        }
      }

      console.log("Deleted existing dependencies, result:", deleteData);

      // Insert new dependencies
      if (dependencyIds.length > 0) {
        const dependencyInserts = dependencyIds.map((depId) => ({
          task_id: taskId,
          depends_on_task_id: depId,
        }));

        console.log("Inserting dependencies:", dependencyInserts);

        const { data: insertData, error: insertError } = await supabase
          .from("task_dependencies")
          .insert(dependencyInserts);

        // Supabase sometimes returns an empty {} as error, which is not a real error
        // Only treat it as an error if it has actual error properties with values
        if (insertError && Object.keys(insertError).length > 0) {
          const errorMessage =
            insertError.message ||
            insertError.code ||
            JSON.stringify(insertError);
          if (errorMessage && errorMessage !== "{}") {
            console.error("Failed to insert dependencies:", insertError);
            throw new Error(`Failed to insert dependencies: ${errorMessage}`);
          }
        }

        console.log("Dependencies saved successfully, result:", insertData);
      } else {
        console.log("No dependencies to insert (empty array)");
      }
    }

    // Refresh tasks to update UI
    await refreshTasks();
    setEditingTaskId(null);
  };

  const refreshTasks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: freshTasks } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .eq("user_id", user.id)
        .is("parent_task_id", null)
        .in("status", ["incomplete", "complete"])
        .order("created_at", { ascending: false });

      if (freshTasks) {
        const taskIds = freshTasks.map((t) => t.id);
        const allSubtasks = await fetchSubtasksRecursive(taskIds);

        // Recursively collect ALL task IDs from nested structure
        const collectAllTaskIds = (taskList: Task[]): string[] => {
          const ids: string[] = [];
          const collect = (task: Task) => {
            ids.push(task.id);
            if (task.subtasks && task.subtasks.length > 0) {
              task.subtasks.forEach(collect);
            }
          };
          taskList.forEach(collect);
          return ids;
        };

        // Load dependencies for ALL tasks at all nesting levels
        const allTaskIds = [...taskIds, ...collectAllTaskIds(allSubtasks)];
        const { data: dependencies } = await supabase
          .from("task_dependencies")
          .select("*")
          .in("task_id", allTaskIds);

        // Recursively attach dependencies to all tasks
        const attachDependencies = (taskList: Task[]): Task[] => {
          return taskList.map((task) => ({
            ...task,
            dependencies:
              dependencies?.filter((dep) => dep.task_id === task.id) || [],
            subtasks: task.subtasks
              ? attachDependencies(task.subtasks)
              : undefined,
          }));
        };

        const tasksWithSubtasks = freshTasks.map((task) => ({
          ...task,
          dependencies:
            dependencies?.filter((dep) => dep.task_id === task.id) || [],
          subtasks: attachDependencies(
            allSubtasks.filter((st) => st.parent_task_id === task.id)
          ),
        }));

        setTasks(tasksWithSubtasks);
      }
    }
  };

  const handleComplete = async (id: string) => {
    // Find the task recursively to check its current status
    const findTaskRecursive = (
      taskList: Task[],
      targetId: string
    ): Task | null => {
      for (const task of taskList) {
        if (task.id === targetId) {
          return task;
        }
        if (task.subtasks && task.subtasks.length > 0) {
          const found = findTaskRecursive(task.subtasks, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    // Recursively collect all subtask IDs
    const collectSubtaskIds = (task: Task): string[] => {
      const ids: string[] = [];
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          ids.push(subtask.id);
          ids.push(...collectSubtaskIds(subtask));
        }
      }
      return ids;
    };

    const task = findTaskRecursive(tasks, id);
    const isCompleted = task?.status === "complete";
    const newStatus = isCompleted ? "incomplete" : "complete";
    const newCompletedAt = isCompleted ? null : new Date().toISOString();

    // Update the main task
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newCompletedAt,
      })
      .eq("id", id);

    if (!error && task) {
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
          await autoCompleteParentTasks(supabase, id, user.id);
        } else {
          await autoUncompleteParentTasks(supabase, id, user.id);
        }
      }

      // Use refreshTasks to properly reload everything including dependencies
      await refreshTasks();
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this task? This cannot be undone."
      )
    ) {
      return;
    }

    // Use secure API for delete operation
    const { taskAPI } = await import("@/lib/api-secure");
    const { error } = await taskAPI.delete(id);

    if (!error) {
      // Refresh tasks to update the list
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: freshTasks } = await supabase
          .from("tasks")
          .select(
            `
            *,
            project:projects(*),
            subtasks:tasks!parent_task_id(
              *,
              project:projects(*),
              subtasks:tasks!parent_task_id(
                *,
                project:projects(*),
                subtasks:tasks!parent_task_id(
                  *,
                  project:projects(*)
                )
              )
            )
          `
          )
          .eq("user_id", user.id)
          .is("parent_task_id", null)
          .in("status", ["incomplete", "complete"])
          .order("created_at", { ascending: false });

        if (freshTasks) {
          setTasks(freshTasks);
        }
      }
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleProjectDragStart = (projectId: string) => {
    setDraggedProjectId(projectId);
  };

  const handleProjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleProjectDrop = async (targetProjectId: string) => {
    if (!draggedProjectId || draggedProjectId === targetProjectId) {
      setDraggedProjectId(null);
      return;
    }

    // Find the dragged and target projects
    const draggedProject = projects.find((p) => p.id === draggedProjectId);
    const targetProject = projects.find((p) => p.id === targetProjectId);

    if (!draggedProject || !targetProject) {
      setDraggedProjectId(null);
      return;
    }

    // Reorder projects array
    const reorderedProjects = [...projects];
    const draggedIndex = reorderedProjects.findIndex(
      (p) => p.id === draggedProjectId
    );
    const targetIndex = reorderedProjects.findIndex(
      (p) => p.id === targetProjectId
    );

    // Remove dragged project and insert at target position
    const [removed] = reorderedProjects.splice(draggedIndex, 1);
    reorderedProjects.splice(targetIndex, 0, removed);

    // Update display_order property on each project object
    const updatedProjects = reorderedProjects.map((project, index) => ({
      ...project,
      display_order: index,
    }));

    // Optimistically update UI with the new display_order values
    setProjects(updatedProjects);

    // Save to database
    for (const project of updatedProjects) {
      await supabase
        .from("projects")
        .update({ display_order: project.display_order })
        .eq("id", project.id);
    }

    setDraggedProjectId(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowTaskModal(true)}
          className="flex-1 py-3 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          + New Task
        </button>
        <button
          onClick={() => setShowProjectModal(true)}
          className="flex-1 py-3 border-2 border-dashed border-zinc-800 rounded-lg text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          + New Project
        </button>
      </div>

      {/* Project Create Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="projectName"
                className="block text-sm font-medium mb-2"
              >
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder="e.g., Payment Integration"
                required
              />
            </div>
            <div>
              <label
                htmlFor="projectDescription"
                className="block text-sm font-medium mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[60px]"
                placeholder="Brief description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-3">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setProjectColor(colorOption.value)}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      projectColor === colorOption.value
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={resetProjectForm}
                className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Task Create Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Task Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                placeholder="What needs to be done?"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 min-h-[60px]"
              />
            </div>

            {/* Project */}
            <div>
              <label
                htmlFor="project"
                className="block text-sm font-medium mb-2"
              >
                Project (optional)
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Analysis Button */}
            <div>
              <button
                type="button"
                onClick={analyzeTaskWithAI}
                disabled={analyzingTask || !title.trim()}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzingTask
                  ? "🤖 Analyzing..."
                  : aiAnalyzed
                  ? "✨ Re-analyze with AI"
                  : "✨ Analyze with AI"}
              </button>
            </div>

            {/* AI Reasoning */}
            {aiAnalyzed && aiReasoning && (
              <div className="p-3 bg-blue-950/30 border border-blue-900 rounded-lg text-xs text-blue-200">
                <div className="font-medium mb-1">AI Reasoning:</div>
                <div className="text-blue-300/80 whitespace-pre-line">
                  {aiReasoning}
                </div>
              </div>
            )}

            {/* Generated Subtasks (Editable) */}
            {aiAnalyzed && aiSubtasks.length > 0 && (
              <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-950/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">
                    Subtasks ({aiSubtasks.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="px-3 py-1 text-xs bg-zinc-800 text-white rounded hover:bg-zinc-700 transition-colors"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {aiSubtasks.map((subtask, index) => (
                    <SubtaskEditItem
                      key={subtask.id}
                      subtask={subtask}
                      index={index}
                      onUpdate={updateSubtask}
                      onRemove={removeSubtask}
                      allSiblings={aiSubtasks}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Execution Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="effort"
                  className="block text-sm font-medium mb-2"
                >
                  Estimated Effort (minutes)
                  {aiSubtasks.length > 0 && (
                    <span className="ml-2 text-xs text-blue-400">
                      (auto-calculated from subtasks)
                    </span>
                  )}
                </label>
                <input
                  id="effort"
                  type="number"
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg focus:outline-none ${
                    aiSubtasks.length > 0
                      ? "bg-zinc-900 border border-blue-900/50 text-blue-300 cursor-not-allowed"
                      : "bg-zinc-950 border border-zinc-800 focus:ring-2 focus:ring-zinc-700"
                  }`}
                  min="5"
                  step="5"
                  disabled={aiSubtasks.length > 0}
                  title={
                    aiSubtasks.length > 0
                      ? "Automatically calculated as sum of all subtasks"
                      : ""
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="energy"
                  className="block text-sm font-medium mb-2"
                >
                  Energy Cost
                </label>
                <select
                  id="energy"
                  value={energyCost}
                  onChange={(e) => setEnergyCost(e.target.value as EnergyCost)}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="focus"
                  className="block text-sm font-medium mb-2"
                >
                  Focus Depth
                </label>
                <select
                  id="focus"
                  value={focusDepth}
                  onChange={(e) => setFocusDepth(e.target.value as FocusDepth)}
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                >
                  <option value="shallow">Shallow</option>
                  <option value="deep">Deep</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="context"
                  className="block text-sm font-medium mb-2"
                >
                  Context Type
                </label>
                <select
                  id="context"
                  value={contextType}
                  onChange={(e) =>
                    setContextType(e.target.value as ContextType)
                  }
                  className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700"
                >
                  <option value="cognitive">Cognitive</option>
                  <option value="admin">Admin</option>
                  <option value="physical">Physical</option>
                </select>
              </div>
            </div>

            {/* Multitask Safe */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="multitask"
                checked={multitaskSafe}
                onChange={(e) => setMultitaskSafe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950"
              />
              <label htmlFor="multitask" className="text-sm">
                Multitask-safe (can be done alongside other activities)
              </label>
            </div>

            {/* Additional Options */}
            <div className="border-t border-zinc-700 pt-4">
              <button
                type="button"
                onClick={() => setShowTaskOptions(!showTaskOptions)}
                className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors px-3 py-2 rounded bg-zinc-800/50 hover:bg-zinc-800 w-full"
              >
                <span>{showTaskOptions ? "▼" : "▶"}</span>
                <span>Additional Options (Dependencies)</span>
                {taskDependencyIds.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded text-xs font-semibold">
                    {taskDependencyIds.length} dependency
                    {taskDependencyIds.length !== 1 ? "ies" : ""}
                  </span>
                )}
              </button>

              {showTaskOptions && (
                <div className="mt-3 p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <label className="block text-sm font-medium mb-3 text-zinc-400">
                    Dependencies (other tasks that must be completed first)
                  </label>
                  {allTasksFlat.filter((t) => t.status !== "complete")
                    .length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">
                      No existing tasks available as dependencies
                    </p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={taskDependencySearch}
                        onChange={(e) =>
                          setTaskDependencySearch(e.target.value)
                        }
                        placeholder="Search tasks..."
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                      />
                      {(() => {
                        const availableTasks = allTasksFlat.filter(
                          (t) => t.status !== "complete"
                        );
                        const filteredTasks = availableTasks.filter((task) => {
                          if (!taskDependencySearch.trim()) return true;
                          const searchLower =
                            taskDependencySearch.toLowerCase();
                          const matchesTitle = task.title
                            ?.toLowerCase()
                            .includes(searchLower);
                          const matchesDescription = task.description
                            ?.toLowerCase()
                            .includes(searchLower);
                          const taskProject = projects.find(
                            (p) => p.id === task.project_id
                          );
                          const matchesProject = taskProject?.name
                            ?.toLowerCase()
                            .includes(searchLower);
                          return (
                            matchesTitle || matchesDescription || matchesProject
                          );
                        });

                        if (filteredTasks.length === 0) {
                          return (
                            <p className="text-sm text-zinc-500 italic">
                              No matches for "{taskDependencySearch}"
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {filteredTasks.map((task) => {
                              const isSelected = taskDependencyIds.includes(
                                task.id
                              );
                              const taskProject = projects.find(
                                (p) => p.id === task.project_id
                              );
                              return (
                                <label
                                  key={task.id}
                                  className="flex items-start gap-3 p-3 hover:bg-zinc-900 rounded cursor-pointer border border-zinc-800"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setTaskDependencyIds([
                                          ...taskDependencyIds,
                                          task.id,
                                        ]);
                                      } else {
                                        setTaskDependencyIds(
                                          taskDependencyIds.filter(
                                            (id) => id !== task.id
                                          )
                                        );
                                      }
                                    }}
                                    className="mt-1 rounded border-zinc-700"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm text-zinc-300 font-medium">
                                      {task.title}
                                    </div>
                                    {task.description && (
                                      <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                                        {task.description}
                                      </div>
                                    )}
                                    {taskProject && (
                                      <div className="text-xs text-zinc-600 mt-1">
                                        📁 {taskProject.name}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={resetTaskForm}
                className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Tasks List - Grouped by Project */}
      {tasks.length > 0 || projects.length > 0 ? (
        <div className="space-y-4">
          {projectGroups.map(({ project, tasks: projectTasks, progress }) => {
            const isExpanded = expandedProjects.has(project.id);
            const progressPercent =
              progress.total > 0
                ? Math.round((progress.completed / progress.total) * 100)
                : 0;
            const isDragging = draggedProjectId === project.id;
            const canDrag = project.id !== "no-project";

            return (
              <div
                key={project.id}
                ref={(el) => {
                  if (el) {
                    projectRefs.current.set(project.id, el);
                  }
                }}
                draggable={canDrag}
                onDragStart={() =>
                  canDrag && handleProjectDragStart(project.id)
                }
                onDragOver={handleProjectDragOver}
                onDrop={() => canDrag && handleProjectDrop(project.id)}
                className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300 ${
                  isDragging ? "opacity-50" : ""
                } ${canDrag ? "cursor-move" : ""}`}
                style={{
                  borderLeftColor: project.color || "#6b7280",
                  borderLeftWidth: "4px",
                }}
              >
                {/* Project Header */}
                {editingProjectId === project.id &&
                project.id !== "no-project" ? (
                  /* Edit mode for project */
                  <div className="p-5 bg-zinc-950/50">
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor={`edit-project-name-${project.id}`}
                          className="block text-sm font-medium mb-2"
                        >
                          Project Name
                        </label>
                        <input
                          type="text"
                          defaultValue={project.name}
                          id={`edit-project-name-${project.id}`}
                          className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded"
                          placeholder="Project name"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`edit-project-desc-${project.id}`}
                          className="block text-sm font-medium mb-2"
                        >
                          Description (optional)
                        </label>
                        <textarea
                          defaultValue={project.description || ""}
                          id={`edit-project-desc-${project.id}`}
                          className="w-full bg-zinc-800 text-zinc-100 px-3 py-2 rounded"
                          placeholder="Description"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-3">
                          Color
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {PROJECT_COLORS.map((colorOption) => (
                            <button
                              key={colorOption.value}
                              type="button"
                              onClick={() =>
                                setEditingProjectColor(colorOption.value)
                              }
                              className={`w-10 h-10 rounded-lg transition-all ${
                                editingProjectColor === colorOption.value
                                  ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110"
                                  : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: colorOption.value }}
                              title={colorOption.name}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const name = (
                              document.getElementById(
                                `edit-project-name-${project.id}`
                              ) as HTMLInputElement
                            ).value;
                            const description = (
                              document.getElementById(
                                `edit-project-desc-${project.id}`
                              ) as HTMLTextAreaElement
                            ).value;
                            handleEditProject(project.id, {
                              name,
                              description,
                              color: editingProjectColor,
                            });
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingProjectId(null)}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => toggleProjectExpansion(project.id)}
                      className="flex-1 p-5 text-left hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          {canDrag && (
                            <span
                              className="text-zinc-600 hover:text-zinc-500 cursor-move"
                              title="Drag to reorder"
                            >
                              ⋮⋮
                            </span>
                          )}
                          <span className="text-zinc-400">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: project.color || "#6b7280",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium text-white">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-sm text-zinc-500 mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-zinc-500 whitespace-nowrap">
                            {projectTasks.length}{" "}
                            {projectTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        </div>
                      </div>

                      {/* Project Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${progressPercent}%`,
                              backgroundColor: project.color || "#6b7280",
                            }}
                          />
                        </div>
                        <span className="text-sm text-zinc-400 whitespace-nowrap">
                          {progress.completed}/{progress.total} done
                        </span>
                      </div>
                    </button>

                    {/* Edit and Delete buttons for real projects only */}
                    {project.id !== "no-project" && (
                      <div className="p-5 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProjectId(project.id);
                            setEditingProjectColor(project.color || "#3b82f6");
                          }}
                          className="px-3 py-1 text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-900 rounded transition-colors cursor-pointer"
                          title="Edit project"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-3 py-1 text-sm bg-red-900/50 text-red-300 hover:bg-red-900 rounded transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks in this project - Only shown when expanded */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 bg-zinc-950/30">
                    <div className="p-4 space-y-3">
                      {projectTasks.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                          No tasks in this project yet. Create a task and assign
                          it to this project.
                        </div>
                      ) : (
                        <>
                          {/* Active Tasks */}
                          {projectTasks
                            .filter((task) => task.status !== "complete")
                            .map((task) => (
                              <div
                                key={task.id}
                                ref={(el) => {
                                  if (el) {
                                    taskRefs.current.set(task.id, el);
                                  }
                                }}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300"
                              >
                                {/* Parent Task */}
                                {editingTaskId === task.id ? (
                                  /* Edit mode for parent task */
                                  <ParentTaskEditForm
                                    task={task}
                                    onSave={(updates, dependencyIds) =>
                                      handleEditTask(
                                        task.id,
                                        updates,
                                        dependencyIds
                                      )
                                    }
                                    onCancel={() => setEditingTaskId(null)}
                                    projects={projects}
                                    allTasks={allTasksFlat}
                                  />
                                ) : (
                                  /* Display mode */
                                  <div className="flex items-start justify-between">
                                    {/* Clickable area to expand/collapse */}
                                    <div
                                      onClick={() =>
                                        task.subtasks &&
                                        task.subtasks.length > 0 &&
                                        toggleTaskExpansion(task.id)
                                      }
                                      className={`flex-1 p-5 ${
                                        task.subtasks &&
                                        task.subtasks.length > 0
                                          ? "cursor-pointer hover:bg-zinc-900/50"
                                          : ""
                                      } ${
                                        task.status === "complete"
                                          ? "opacity-60"
                                          : ""
                                      }`}
                                    >
                                      <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          {task.subtasks &&
                                            task.subtasks.length > 0 && (
                                              <span className="text-zinc-400">
                                                {expandedTasks.has(task.id)
                                                  ? "▼"
                                                  : "▶"}
                                              </span>
                                            )}
                                          <h3
                                            className={`text-lg font-medium ${
                                              task.status === "complete"
                                                ? "line-through"
                                                : ""
                                            }`}
                                          >
                                            {task.title}
                                          </h3>
                                          {task.status === "complete" && (
                                            <span className="text-xs text-green-500">
                                              ✓ Completed
                                            </span>
                                          )}
                                        </div>
                                        {task.description && (
                                          <p className="text-sm text-zinc-400 mb-2">
                                            {task.description}
                                          </p>
                                        )}

                                        {/* Progress bar for parent tasks with subtasks */}
                                        {task.subtasks &&
                                          task.subtasks.length > 0 &&
                                          (() => {
                                            const progress =
                                              calculateProgress(task);
                                            const progressPercent = Math.round(
                                              (progress.completed /
                                                progress.total) *
                                                100
                                            );
                                            return (
                                              <div className="mb-3">
                                                <div className="flex items-center gap-3">
                                                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                      className="h-full bg-zinc-400 transition-all duration-300"
                                                      style={{
                                                        width: `${progressPercent}%`,
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="text-sm text-zinc-400 whitespace-nowrap">
                                                    {progress.completed}/
                                                    {progress.total} done
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })()}

                                        {task.project && (
                                          <span className="text-xs text-zinc-500">
                                            {task.project.name}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                          {task.estimated_effort}m
                                        </span>
                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                          {task.energy_cost} energy
                                        </span>
                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                          {task.focus_depth} focus
                                        </span>
                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                          {task.context_type}
                                        </span>
                                        {task.multitask_safe && (
                                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                            multitask-safe
                                          </span>
                                        )}
                                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded capitalize">
                                          {task.status}
                                        </span>
                                      </div>

                                      {/* Dependencies Display for Parent Tasks */}
                                      {task.dependencies &&
                                        task.dependencies.length > 0 && (
                                          <div className="mt-3 pt-3 border-t border-zinc-800">
                                            <div className="text-sm font-medium text-zinc-400 mb-2">
                                              🔗 Depends on:
                                            </div>
                                            <div className="space-y-1">
                                              {task.dependencies.map((dep) => {
                                                const depTask =
                                                  allTasksFlat.find(
                                                    (t) =>
                                                      t.id ===
                                                      dep.depends_on_task_id
                                                  );
                                                if (!depTask) return null;
                                                return (
                                                  <div
                                                    key={dep.id}
                                                    className="flex items-center gap-2 text-sm"
                                                  >
                                                    <span
                                                      className={
                                                        depTask.status ===
                                                        "complete"
                                                          ? "text-green-500"
                                                          : "text-yellow-500"
                                                      }
                                                    >
                                                      {depTask.status ===
                                                      "complete"
                                                        ? "✓"
                                                        : "⏸"}
                                                    </span>
                                                    <span
                                                      className={`${
                                                        depTask.status ===
                                                        "complete"
                                                          ? "text-zinc-500 line-through"
                                                          : "text-zinc-300"
                                                      }`}
                                                    >
                                                      {depTask.title}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                    </div>

                                    {/* Action buttons - not part of clickable area */}
                                    <div className="flex gap-2 p-5">
                                      <button
                                        onClick={() =>
                                          setEditingTaskId(task.id)
                                        }
                                        className="px-4 py-1 text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-900 rounded transition-colors cursor-pointer"
                                        title="Edit"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleComplete(task.id)}
                                        className={`px-4 py-1 text-sm rounded transition-colors cursor-pointer ${
                                          task.status === "complete"
                                            ? "bg-green-600 hover:bg-green-500 text-white"
                                            : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400"
                                        }`}
                                        title={
                                          task.status === "complete"
                                            ? "Mark as incomplete"
                                            : "Mark as complete"
                                        }
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => handleDelete(task.id)}
                                        className="px-3 py-1 text-sm bg-red-900/50 text-red-300 hover:bg-red-900 rounded transition-colors cursor-pointer"
                                        title="Delete task"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Sub-tasks */}
                                {task.subtasks &&
                                  task.subtasks.length > 0 &&
                                  expandedTasks.has(task.id) && (
                                    <div className="border-t border-zinc-800 bg-zinc-950/50 px-5 py-3">
                                      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                                        Sub-tasks ({task.subtasks.length})
                                      </div>
                                      <div className="space-y-2">
                                        {task.subtasks.map((subtask: Task) => (
                                          <SubTaskDisplay
                                            key={subtask.id}
                                            subtask={subtask}
                                            onEdit={handleEditTask}
                                            editingId={editingTaskId}
                                            setEditingId={setEditingTaskId}
                                            depth={0}
                                            onComplete={handleComplete}
                                            onDelete={handleDelete}
                                            taskRefs={taskRefs}
                                            allTasks={allTasksFlat}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ))}

                          {/* Completed Tasks Section */}
                          {projectTasks.filter(
                            (task) => task.status === "complete"
                          ).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                              <button
                                onClick={() =>
                                  toggleCompletedInProject(project.id)
                                }
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-900 rounded transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-zinc-400">
                                    {showCompletedInProject.has(project.id)
                                      ? "▼"
                                      : "▶"}
                                  </span>
                                  <span className="text-sm text-zinc-400">
                                    Completed Tasks (
                                    {
                                      projectTasks.filter(
                                        (task) => task.status === "complete"
                                      ).length
                                    }
                                    )
                                  </span>
                                </div>
                                <span className="text-xs text-green-500">
                                  ✓
                                </span>
                              </button>

                              {showCompletedInProject.has(project.id) && (
                                <div className="mt-3 space-y-3 pl-4">
                                  {projectTasks
                                    .filter(
                                      (task) => task.status === "complete"
                                    )
                                    .map((task) => (
                                      <div
                                        key={task.id}
                                        ref={(el) => {
                                          if (el) {
                                            taskRefs.current.set(task.id, el);
                                          }
                                        }}
                                        className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all duration-300 opacity-60"
                                      >
                                        {/* Parent Task */}
                                        {editingTaskId === task.id ? (
                                          /* Edit mode for parent task */
                                          <ParentTaskEditForm
                                            task={task}
                                            onSave={(updates, dependencyIds) =>
                                              handleEditTask(
                                                task.id,
                                                updates,
                                                dependencyIds
                                              )
                                            }
                                            onCancel={() =>
                                              setEditingTaskId(null)
                                            }
                                            projects={projects}
                                            allTasks={allTasksFlat}
                                          />
                                        ) : (
                                          /* Display mode */
                                          <div className="flex items-start justify-between">
                                            {/* Clickable area to expand/collapse */}
                                            <div
                                              onClick={() =>
                                                task.subtasks &&
                                                task.subtasks.length > 0 &&
                                                toggleTaskExpansion(task.id)
                                              }
                                              className={`flex-1 p-5 ${
                                                task.subtasks &&
                                                task.subtasks.length > 0
                                                  ? "cursor-pointer hover:bg-zinc-900/50"
                                                  : ""
                                              } ${
                                                task.status === "complete"
                                                  ? "opacity-60"
                                                  : ""
                                              }`}
                                            >
                                              <div className="mb-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                  {task.subtasks &&
                                                    task.subtasks.length >
                                                      0 && (
                                                      <span className="text-zinc-400">
                                                        {expandedTasks.has(
                                                          task.id
                                                        )
                                                          ? "▼"
                                                          : "▶"}
                                                      </span>
                                                    )}
                                                  <h3
                                                    className={`text-lg font-medium ${
                                                      task.status === "complete"
                                                        ? "line-through"
                                                        : ""
                                                    }`}
                                                  >
                                                    {task.title}
                                                  </h3>
                                                  {task.status ===
                                                    "complete" && (
                                                    <span className="text-xs text-green-500">
                                                      ✓ Completed
                                                    </span>
                                                  )}
                                                </div>
                                                {task.description && (
                                                  <p className="text-sm text-zinc-400 mb-2">
                                                    {task.description}
                                                  </p>
                                                )}

                                                {/* Progress bar for parent tasks with subtasks */}
                                                {task.subtasks &&
                                                  task.subtasks.length > 0 &&
                                                  (() => {
                                                    const progress =
                                                      calculateProgress(task);
                                                    const progressPercent =
                                                      Math.round(
                                                        (progress.completed /
                                                          progress.total) *
                                                          100
                                                      );
                                                    return (
                                                      <div className="mb-3">
                                                        <div className="flex items-center gap-3">
                                                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                              className="h-full bg-zinc-400 transition-all duration-300"
                                                              style={{
                                                                width: `${progressPercent}%`,
                                                              }}
                                                            />
                                                          </div>
                                                          <span className="text-sm text-zinc-400 whitespace-nowrap">
                                                            {progress.completed}
                                                            /{progress.total}{" "}
                                                            done
                                                          </span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })()}

                                                {task.project && (
                                                  <span className="text-xs text-zinc-500">
                                                    {task.project.name}
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex flex-wrap gap-2">
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                                  {task.estimated_effort}m
                                                </span>
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                                  {task.energy_cost} energy
                                                </span>
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                                  {task.focus_depth} focus
                                                </span>
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                                  {task.context_type}
                                                </span>
                                                {task.multitask_safe && (
                                                  <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded">
                                                    multitask-safe
                                                  </span>
                                                )}
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded capitalize">
                                                  {task.status}
                                                </span>
                                              </div>

                                              {/* Dependencies Display for Parent Tasks */}
                                              {task.dependencies &&
                                                task.dependencies.length >
                                                  0 && (
                                                  <div className="mt-3 pt-3 border-t border-zinc-800">
                                                    <div className="text-sm font-medium text-zinc-400 mb-2">
                                                      🔗 Depends on:
                                                    </div>
                                                    <div className="space-y-1">
                                                      {task.dependencies.map(
                                                        (dep) => {
                                                          const depTask =
                                                            allTasksFlat.find(
                                                              (t) =>
                                                                t.id ===
                                                                dep.depends_on_task_id
                                                            );
                                                          if (!depTask)
                                                            return null;
                                                          return (
                                                            <div
                                                              key={dep.id}
                                                              className="flex items-center gap-2 text-sm"
                                                            >
                                                              <span
                                                                className={
                                                                  depTask.status ===
                                                                  "complete"
                                                                    ? "text-green-500"
                                                                    : "text-yellow-500"
                                                                }
                                                              >
                                                                {depTask.status ===
                                                                "complete"
                                                                  ? "✓"
                                                                  : "⏸"}
                                                              </span>
                                                              <span
                                                                className={`${
                                                                  depTask.status ===
                                                                  "complete"
                                                                    ? "text-zinc-500 line-through"
                                                                    : "text-zinc-300"
                                                                }`}
                                                              >
                                                                {depTask.title}
                                                              </span>
                                                            </div>
                                                          );
                                                        }
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                            </div>

                                            {/* Action buttons - not part of clickable area */}
                                            <div className="flex gap-2 p-5">
                                              <button
                                                onClick={() =>
                                                  setEditingTaskId(task.id)
                                                }
                                                className="px-4 py-1 text-sm bg-blue-900/50 text-blue-300 hover:bg-blue-900 rounded transition-colors cursor-pointer"
                                                title="Edit"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleComplete(task.id)
                                                }
                                                className={`px-4 py-1 text-sm rounded transition-colors cursor-pointer ${
                                                  task.status === "complete"
                                                    ? "bg-green-600 hover:bg-green-500 text-white"
                                                    : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400"
                                                }`}
                                                title={
                                                  task.status === "complete"
                                                    ? "Mark as incomplete"
                                                    : "Mark as complete"
                                                }
                                              >
                                                ✓
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleDelete(task.id)
                                                }
                                                className="px-3 py-1 text-sm bg-red-900/50 text-red-300 hover:bg-red-900 rounded transition-colors cursor-pointer"
                                                title="Delete task"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* Sub-tasks */}
                                        {task.subtasks &&
                                          task.subtasks.length > 0 &&
                                          expandedTasks.has(task.id) && (
                                            <div className="border-t border-zinc-800 bg-zinc-950/50 px-5 py-3">
                                              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                                                Sub-tasks (
                                                {task.subtasks.length})
                                              </div>
                                              <div className="space-y-2">
                                                {task.subtasks.map(
                                                  (subtask: Task) => (
                                                    <SubTaskDisplay
                                                      key={subtask.id}
                                                      subtask={subtask}
                                                      onEdit={handleEditTask}
                                                      editingId={editingTaskId}
                                                      setEditingId={
                                                        setEditingTaskId
                                                      }
                                                      depth={0}
                                                      onComplete={
                                                        handleComplete
                                                      }
                                                      onDelete={handleDelete}
                                                      taskRefs={taskRefs}
                                                      allTasks={allTasksFlat}
                                                    />
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500">
          No tasks yet. Create a project and add tasks to get started.
        </div>
      )}
    </div>
  );
}
