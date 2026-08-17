"use client";

import { useRouter } from "next/navigation";

import { ContentErrorView } from "./content-error-view";

export function ContentLoadError() {
  const router = useRouter();
  return <ContentErrorView onRetry={() => router.refresh()} />;
}
