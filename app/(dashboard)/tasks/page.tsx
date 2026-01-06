import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TasksList } from "./tasks-list";
import Link from "next/link";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get parent tasks (no parent_task_id) with their subtasks, including complete
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, project:projects(*)")
    .eq("user_id", user.id)
    .is("parent_task_id", null)
    .in("status", ["incomplete", "complete"])
    .order("created_at", { ascending: false });

  // Recursively load all nested subtasks
  async function loadSubtasksRecursively(parentIds: string[]): Promise<any[]> {
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
    const nestedSubtasks = await loadSubtasksRecursively(nestedIds);

    // Attach nested subtasks to their parents
    return subtasks.map((st) => ({
      ...st,
      subtasks: nestedSubtasks.filter((nst) => nst.parent_task_id === st.id),
    }));
  }

  // Get all subtasks with full nesting
  const taskIds = tasks?.map((t) => t.id) || [];
  const allSubtasks = await loadSubtasksRecursively(taskIds);

  // Recursively collect ALL task IDs from nested structure
  const collectAllTaskIds = (taskList: any[]): string[] => {
    const ids: string[] = [];
    const collect = (task: any) => {
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

  // Recursively attach dependencies to tasks
  const attachDependencies = (taskList: any[]): any[] => {
    return taskList.map((task) => ({
      ...task,
      dependencies:
        dependencies?.filter((dep) => dep.task_id === task.id) || [],
      subtasks: task.subtasks ? attachDependencies(task.subtasks) : undefined,
    }));
  };

  // Attach subtasks and dependencies to parent tasks
  const tasksWithSubtasks =
    tasks?.map((task) => ({
      ...task,
      dependencies:
        dependencies?.filter((dep) => dep.task_id === task.id) || [],
      subtasks: attachDependencies(
        allSubtasks.filter((st) => st.parent_task_id === task.id)
      ),
    })) || [];

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("display_order", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Projects & Tasks</h1>
        <p className="text-zinc-400">Organize your work by project</p>
      </div>

      <TasksList initialTasks={tasksWithSubtasks} projects={projects || []} />
    </div>
  );
}
