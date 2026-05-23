import { useCallback, useEffect, useState } from "react";
import { api, type Project } from "@/lib/api";

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load projects");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { projects, error, refresh };
}
