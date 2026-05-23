import { Board } from "./components/Board";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { useHashRoute } from "./hooks/useHashRoute";
import { useProjects } from "./hooks/useProjects";

export function App() {
  const route = useHashRoute();
  const { projects, error, refresh } = useProjects();
  const selectedProjectId =
    route.name === "board" ? route.projectId : null;
  const selectedProject =
    projects?.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className="flex h-screen">
      <ProjectSidebar
        projects={projects}
        error={error}
        selectedProjectId={selectedProjectId}
        onRefresh={refresh}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedProjectId ? (
          <Board
            key={selectedProjectId}
            projectId={selectedProjectId}
            projectName={selectedProject?.name}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a project to view its board
          </div>
        )}
      </main>
    </div>
  );
}
