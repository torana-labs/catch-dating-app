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

export function ProfileStrength({
  className,
  value,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  value: number;
}) {
  return (
    <div
      {...props}
      className={classNames("profile-strength", className)}
      aria-label={props["aria-label"] ?? `Profile strength ${value}%`}
    >
      <span>{value}%</span>
      <i><b style={{width: `${value}%`}} /></i>
    </div>
  );
}

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
