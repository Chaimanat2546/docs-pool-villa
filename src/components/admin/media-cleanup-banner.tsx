"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { MediaOperationView } from "@/lib/media/lifecycle-types";
import { retryMediaCleanup } from "@/app/admin/(content)/documents/actions";

import { MediaOperationBanner } from "./media-operation-banner";

export function MediaCleanupBanner({ initialOperation }: { initialOperation: MediaOperationView }) {
  const router = useRouter();
  const retried = useRef(false);
  const [operation, setOperation] = useState(initialOperation);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const retry = useCallback(() => startTransition(async () => {
    const result = await retryMediaCleanup();
    if (result.status === "complete") router.refresh();
    else if (result.status === "pending") setOperation(result.remaining[0]);
    else setMessage(result.error);
  }), [router]);
  useEffect(() => { if (!retried.current) { retried.current = true; retry(); } }, [retry]); // one bounded retry per mount
  return <>{message && <p role="alert" className="mb-4 text-sm text-destructive">{message}</p>}<MediaOperationBanner operation={operation} pending={pending} onRetry={retry} /></>;
}
