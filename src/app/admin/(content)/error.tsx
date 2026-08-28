"use client";

import { ContentErrorView } from "./content-error-view";

type ContentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ContentError({ reset }: ContentErrorProps) {
  return <ContentErrorView onRetry={reset} />;
}
