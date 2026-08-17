import { Check, ClipboardList, FileText, Power } from "lucide-react";

const documentSteps = [
  { key: "setup", label: "ข้อมูลเอกสาร", Icon: ClipboardList },
  { key: "content", label: "เขียนเนื้อหา", Icon: FileText },
  { key: "review", label: "สถานะเอกสาร", Icon: Power },
] as const;

type DocumentStep = (typeof documentSteps)[number]["key"];

export function DocumentProgressStepper({ currentStep }: { currentStep: DocumentStep }) {
  const currentIndex = documentSteps.findIndex((step) => step.key === currentStep);

  return (
    <ol aria-label="ขั้นตอนจัดทำเอกสาร" className="mb-8 flex items-start text-center">
      {documentSteps.map(({ key, label, Icon }, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;
        const state = completed ? "completed" : current ? "current" : "upcoming";
        const MarkerIcon = completed ? Check : Icon;
        const markerClass = completed
          ? "bg-emerald-100 text-emerald-800"
          : current
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground";

        return (
          <li
            key={key}
            data-state={state}
            aria-current={current ? "step" : undefined}
            className="flex min-w-0 flex-1 items-start last:flex-none"
          >
            <div className="flex min-w-0 shrink-0 flex-col items-center gap-2">
              <span className={`flex size-10 items-center justify-center rounded-full lg:size-12 ${markerClass}`}>
                <MarkerIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 text-xs font-medium leading-tight text-foreground sm:text-sm">
                {label}
              </span>
            </div>
            {index < documentSteps.length - 1 && (
              <span
                data-step-connector
                aria-hidden="true"
                className={`mt-5 h-1 min-w-2 flex-1 rounded-full lg:mt-6 ${
                  completed ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
