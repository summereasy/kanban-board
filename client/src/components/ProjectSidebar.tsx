import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, type Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { navigate } from "@/hooks/useHashRoute";
import { cn } from "@/lib/utils";

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; project: Project };

type Props = {
  projects: Project[] | null;
  error: string | null;
  selectedProjectId: string | null;
  onRefresh: () => Promise<void>;
};

export function ProjectSidebar({
  projects,
  error,
  selectedProjectId,
  onRefresh,
}: Props) {
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });

  const handleDelete = async (project: Project) => {
    const ok = window.confirm(
      `Delete project "${project.name}" and its board?`,
    );
    if (!ok) return;
    await api.deleteProject(project.id);
    if (project.id === selectedProjectId) navigate("/");
    await onRefresh();
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-sm font-semibold tracking-tight">Projects</h1>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setDialog({ mode: "create" })}
          aria-label="New project"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="mb-2 px-2 text-xs text-destructive">{error}</div>
        )}
        {projects === null ? (
          <div className="px-2 text-xs text-muted-foreground">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="px-2 text-xs text-muted-foreground">
            No projects yet. Click + to create one.
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {projects.map((p) => (
              <li key={p.id} className="group relative">
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 pr-14 text-left text-sm transition-colors",
                    p.id === selectedProjectId
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="truncate">{p.name}</div>
                </button>
                <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDialog({ mode: "edit", project: p });
                    }}
                    aria-label="Rename project"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(p);
                    }}
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProjectDialog
        state={dialog}
        onOpenChange={(open) => !open && setDialog({ mode: "closed" })}
        onSubmit={async (name) => {
          if (dialog.mode === "create") {
            const created = await api.createProject(name);
            await onRefresh();
            navigate(`/projects/${created.id}`);
          } else if (dialog.mode === "edit") {
            await api.renameProject(dialog.project.id, name);
            await onRefresh();
          }
        }}
      />
    </aside>
  );
}

type ProjectDialogProps = {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
};

function ProjectDialog({ state, onOpenChange, onSubmit }: ProjectDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.mode === "edit") setName(state.project.name);
    else if (state.mode === "create") setName("");
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isCreate = state.mode === "create";

  return (
    <Dialog open={state.mode !== "closed"} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "New project" : "Rename project"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Each project has its own isolated kanban board."
              : "Update the project name."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="project-name">
              Name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
