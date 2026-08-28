import { requireAdmin } from "@/lib/auth/require-admin";

import { EditorSandbox } from "./sandbox";

export default async function EditorPage() {
  await requireAdmin();
  return <EditorSandbox />;
}
