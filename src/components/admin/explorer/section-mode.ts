export type SectionMode = "view" | "create-root" | "create-child" | "edit" | "reorder";

export function sectionMode(value: string | string[] | undefined): SectionMode {
  return value === "create-root" || value === "create-child" || value === "edit" || value === "reorder" ? value : "view";
}
