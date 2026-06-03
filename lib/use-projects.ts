"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type CreateProjectInput = {
  name?: string;
  description?: string;
};

type UpdateProjectInput = Parameters<
  ReturnType<typeof useMutation<typeof api.projects.update>>
>[0];

export function useProjects() {
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);

  return {
    projects,
    isLoading: projects === undefined,
    createProject: (input: CreateProjectInput = {}) => createProject(input),
    updateProject: (input: UpdateProjectInput) => updateProject(input),
    deleteProject: (id: Id<"projects">) => deleteProject({ id }),
  };
}