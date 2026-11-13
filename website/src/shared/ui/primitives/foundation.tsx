import {classNames} from "@catch/web-ui";
import type {HTMLAttributes, ReactNode} from "react";
import type {ActionGroupVariant} from "./actions";

export interface ActivityMeta {
  label: string;
  token: string;
  short: string;
}

export interface PublicSearchSuggestion {
  id: string;
  href: string;
  label: string;
  meta: string;
  type: "organizer" | "event" | "format";
  activityToken?: string;
}

export {classNames};

export const actionGroupClassNames: Record<ActionGroupVariant, string> = {
  flow: "flow-actions",
  hero: "hero__actions",
  marketing: "marketing-actions",
  "host-create-flow": "host-create-flow__actions",
};

export function OperationalNote({
  body,
  className,
  title,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  body: ReactNode;
  title: ReactNode;
}) {
  return (
    <div {...props} className={classNames("operational-note", className)}>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
