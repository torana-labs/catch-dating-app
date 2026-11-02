import {CatchLoadingIndicator} from "@catch/web-ui";
import type {ReactNode} from "react";
import {EmptyState} from "../shared/ui/AdminPrimitives";

/** The shell's loading state: its route fallbacks and session checks. */
export function AdminFeatureLoadingState({
  label,
}: {
  label: ReactNode;
}) {
  return (
    <EmptyState
      variant="marketing"
      icon={<CatchLoadingIndicator recipe="inline" size={18} />}
    >
      {label}...
    </EmptyState>
  );
}
