import {ButtonLink, PlainButton, PlainLink, buttonClassName} from "./actionControls";
import type {ButtonSize, ButtonVariant} from "./actionControls";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";
import {ButtonControl, classNames} from "@catch/web-ui";
import type {AppDownloadStorePlatform} from "./marketing";

import {StatStrip, actionGroupClassNames} from "./foundation";
import {UiLabel} from "./layout";

export {ButtonLink, PlainButton, PlainLink} from "./actionControls";
export type {ButtonSize, ButtonVariant} from "./actionControls";

export type ActionGroupVariant = "flow" | "hero" | "host-create-flow" | "marketing";

export interface ProcessStatusAction {
  href: string;
  label: ReactNode;
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  trackingLabel?: string;
  variant?: "primary" | "secondary";
}

export interface EventActionCardAction {
  href: string;
  label: ReactNode;
  onClick?: () => void;
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>["rel"];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  trackingLabel?: string;
  variant?: "primary" | "secondary";
}

export interface EventActionCardModel {
  actions: EventActionCardAction[];
  activityToken: string;
  body: ReactNode;
  counts: Array<{label: ReactNode; value: ReactNode}>;
  eyebrow: ReactNode;
  id: string;
  meta: Array<{label: ReactNode; value: ReactNode}>;
  title: ReactNode;
}

export interface AppDownloadCtaItem {
  href: string;
  kicker: string;
  label: string;
  platform: AppDownloadStorePlatform;
}

export function Button({
  children,
  className,
  loading = false,
  loadingLabel,
  size,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <ButtonControl
      className={buttonClassName({className, size, variant})}
      loading={loading}
      {...props}
    >
      {loading ? loadingLabel ?? children : children}
    </ButtonControl>
  );
}

export function TextActionButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
}) {
  return (
    <PlainButton className={classNames("see-all-button", className)} type="button" {...props}>
      {children}
    </PlainButton>
  );
}

export function ActionGroup({
  children,
  className,
  reveal = false,
  variant = "flow",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  reveal?: boolean;
  variant?: ActionGroupVariant;
}) {
  return (
    <div
      {...props}
      className={classNames(actionGroupClassNames[variant], className)}
      data-reveal={reveal || undefined}
    >
      {children}
    </div>
  );
}
