import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  // Redirect to the combined Projects & Tasks page
  redirect("/tasks");
}
