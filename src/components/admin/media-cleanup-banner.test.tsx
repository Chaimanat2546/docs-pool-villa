/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const { refresh, retryMediaCleanup } = vi.hoisted(() => ({ refresh: vi.fn(), retryMediaCleanup: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/admin/(content)/documents/actions", () => ({ retryMediaCleanup }));

import { MediaCleanupBanner } from "./media-cleanup-banner";

it("runs one bounded cleanup retry when the document list is opened", async () => {
  retryMediaCleanup.mockResolvedValueOnce({ status: "complete" });
  render(<MediaCleanupBanner initialOperation={{ operationId: "11111111-1111-4111-8111-111111111111", kind: "cleanup", targetId: "22222222-2222-4222-8222-222222222222", files: ["รูปตกค้าง.webp"], attemptCount: 1, message: "ลบครั้งก่อนล้มเหลว" }} />);
  expect(screen.getByText("รูปตกค้าง.webp")).not.toBeNull();
  await waitFor(() => expect(retryMediaCleanup).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
});
