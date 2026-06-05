"use client";

import dynamic from "next/dynamic";

import StyleGuideLoading from "./loading";

const StyleGuidePage = dynamic(
  () => import("@/components/style-guide/style-guide-page").then((module) => module.StyleGuidePage),
  {
    ssr: false,
    loading: () => <StyleGuideLoading />,
  }
);

export function StyleGuideRouteClient() {
  return <StyleGuidePage />;
}