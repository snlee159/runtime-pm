import { SupabaseClient } from "@supabase/supabase-js";

/**
 * After completing a task, check if all sibling tasks are complete.
 * If so, automatically mark the parent as complete.
 * Recursively check up the tree.
 */
export async function autoCompleteParentTasks(
  supabase: SupabaseClient,
  taskId: string,
  userId: string
) {
  try {
    // Get the task that was just completed
    const { data: completedTask, error: taskError } = await supabase
      .from("tasks")
      .select("id, parent_task_id, status")
      .eq("id", taskId)
      .single();

    if (taskError || !completedTask) {
      console.error("Error fetching completed task:", taskError);
      return;
    }

    // Only proceed if the task is complete and has a parent
    if (completedTask.status !== "complete" || !completedTask.parent_task_id) {
      return;
    }

    await checkAndCompleteParent(
      supabase,
      completedTask.parent_task_id,
      userId
    );
  } catch (error) {
    console.error("Error in autoCompleteParentTasks:", error);
  }
}

/**
 * Recursively check if a parent task should be completed
 */
async function checkAndCompleteParent(
  supabase: SupabaseClient,
  parentId: string,
  userId: string
) {
  // Get all sibling tasks (children of this parent)
  const { data: siblings, error: siblingsError } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("parent_task_id", parentId)
    .eq("user_id", userId);

  if (siblingsError || !siblings) {
    console.error("Error fetching siblings:", siblingsError);
    return;
  }

  // Check if all siblings are complete
  const allSiblingsComplete = siblings.every(
    (sibling) => sibling.status === "complete"
  );

  if (allSiblingsComplete && siblings.length > 0) {
    // Mark the parent as complete
    const { error: updateError, data: updatedParent } = await supabase
      .from("tasks")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", parentId)
      .eq("user_id", userId)
      .select("parent_task_id")
      .single();

    if (updateError) {
      console.error("Error updating parent task:", updateError);
      return;
    }

    console.log(`✅ Auto-completed parent task: ${parentId}`);

    // Recursively check if this parent has a parent
    if (updatedParent?.parent_task_id) {
      await checkAndCompleteParent(
        supabase,
        updatedParent.parent_task_id,
        userId
      );
    }
  }
}

/**
 * After uncompleting a task, check if parent should be uncompleted.
 * A parent should be uncomplete if any child is incomplete.
 */
export async function autoUncompleteParentTasks(
  supabase: SupabaseClient,
  taskId: string,
  userId: string
) {
  try {
    // Get the task that was just marked incomplete
    const { data: incompletedTask, error: taskError } = await supabase
      .from("tasks")
      .select("id, parent_task_id, status")
      .eq("id", taskId)
      .single();

    if (taskError || !incompletedTask) {
      console.error("Error fetching incompleted task:", taskError);
      return;
    }

    // Only proceed if the task is incomplete and has a parent
    if (
      incompletedTask.status !== "incomplete" ||
      !incompletedTask.parent_task_id
    ) {
      return;
    }

    // Recursively uncomplete parents up the tree
    await uncheckParentChain(supabase, incompletedTask.parent_task_id, userId);
  } catch (error) {
    console.error("Error in autoUncompleteParentTasks:", error);
  }
}

/**
 * Recursively uncomplete parent tasks up the tree
 */
async function uncheckParentChain(
  supabase: SupabaseClient,
  parentId: string,
  userId: string
) {
  // Get the parent task
  const { data: parent, error: parentError } = await supabase
    .from("tasks")
    .select("id, status, parent_task_id")
    .eq("id", parentId)
    .eq("user_id", userId)
    .single();

  if (parentError || !parent) {
    return;
  }

  // Only uncomplete if it's currently complete
  if (parent.status === "complete") {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: "incomplete",
        completed_at: null,
      })
      .eq("id", parentId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error uncompleting parent task:", updateError);
      return;
    }

    console.log(`↩️ Auto-uncompleted parent task: ${parentId}`);

    // Recursively uncomplete grandparent
    if (parent.parent_task_id) {
      await uncheckParentChain(supabase, parent.parent_task_id, userId);
    }
  }
}
