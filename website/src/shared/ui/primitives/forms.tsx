import {forwardRef} from "react";
import {CheckboxControl} from "@catch/web-ui";
import type {
  FormHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import type {FormStatus as FormStatusModel} from "../../forms/types";
import {usePendingRequestNavigationBlocked} from "../../pendingRequest";
import {LiveStatus} from "./feedback";
import {classNames} from "@catch/web-ui";

export type SearchFormVariant = "organizer" | "public";

export function ListingFormatRow({
  children,
  className,
  items,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  items?: ReactNode[];
}) {
  return (
    <div {...props} className={classNames("listing-format-row", className)}>
      {children ?? items?.map((item, index) => <span key={index}>{item}</span>)}
    </div>
  );
}

export function SelectedListingCard({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
}) {
  return (
    <div {...props} className={classNames("selected-listing-card", className)}>
      {children}
    </div>
  );
}

export function CheckboxField({
  children,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <CheckboxControl {...props} />
      {children}
    </label>
  );
}

export function ListingReviewCheckbox({
  className,
  ...props
}: Parameters<typeof CheckboxField>[0]) {
  return <CheckboxField {...props} className={classNames("listing-review-checkbox", className)} />;
}

export function FormStatus({
  status,
}: {
  status: FormStatusModel;
}) {
  return (
    <LiveStatus className={classNames("form-status", status.tone)}>
      {status.message}
    </LiveStatus>
  );
}

export const Form = forwardRef<
  HTMLFormElement,
  FormHTMLAttributes<HTMLFormElement> & {pending?: boolean; reveal?: boolean}
>(function Form({
  children,
  pending,
  reveal = false,
  ...props
}, ref) {
  const navigationBlocked = usePendingRequestNavigationBlocked();
  const controlsDisabled = pending === true || navigationBlocked;
  const renderControlBoundary = pending !== undefined || navigationBlocked;

  return (
    <form
      {...props}
      aria-busy={pending || undefined}
      data-reveal={reveal || undefined}
      ref={ref}
    >
      {!renderControlBoundary ? children : (
        <fieldset className="form-control-boundary" disabled={controlsDisabled}>
          {children}
        </fieldset>
      )}
    </form>
  );
});

export const ListingReviewForm = forwardRef<
  HTMLFormElement,
  FormHTMLAttributes<HTMLFormElement> & {pending?: boolean; reveal?: boolean}
>(function ListingReviewForm({
  className,
  ...props
}, ref) {
  return (
    <Form
      {...props}
      className={classNames("listing-review-form", className)}
      ref={ref}
    />
  );
});

export const ClaimRequestForm = forwardRef<
  HTMLFormElement,
  FormHTMLAttributes<HTMLFormElement> & {pending?: boolean; reveal?: boolean}
>(function ClaimRequestForm({
  className,
  ...props
}, ref) {
  return (
    <Form
      {...props}
      className={classNames("claim-request-form", className)}
      ref={ref}
    />
  );
});

export const searchFormClassNames: Record<SearchFormVariant, string> = {
  organizer: "organizer-search-form",
  public: "public-search",
};
