"use client";

import dynamic from "next/dynamic";

import { ReduxProvider } from "@/components/redux/provider";

import ProjectLoading from "./loading";

const ProjectEditorPage = dynamic(
  () => import("@/components/editor/project-editor-page").then((module) => module.ProjectEditorPage),
  {
    ssr: false,
    loading: () => <ProjectLoading />,
  }
);

export function ProjectRouteClient() {
  return (
    <ReduxProvider>
      <ProjectEditorPage />
    </ReduxProvider>
  );
}
