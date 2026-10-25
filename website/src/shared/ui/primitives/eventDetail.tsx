import {useEffect, useId, useRef, useState} from "react";
import type {
  AnchorHTMLAttributes,
  CSSProperties,
  FormHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import {Button, PlainLink} from "./actions";
import {CheckboxField} from "./forms";
import {classNames} from "./foundation";
import {UiLabel} from "./layout";

export function EventDetailHeroLayout({activityToken, children, eyebrow, facts, media, host, title, badge}: {
  activityToken: string; children: ReactNode; eyebrow: ReactNode;
  facts: Array<{label: ReactNode; value: ReactNode}>; media: ReactNode;
  host: ReactNode; title: ReactNode; badge?: ReactNode;
}) {
  return <section className="event-detail-hero" aria-labelledby="event-detail-title"
    style={{"--activity": activityToken} as CSSProperties}>
    <div className="event-detail-hero__inner">
      {media}
      <div className="event-detail-ticket__body">
        <UiLabel>{eyebrow}</UiLabel>
        {badge}
        <h1 id="event-detail-title">{title}</h1>
        <div className="event-detail-host-byline">{host}</div>
        <EventDetailHeroFacts items={facts} />
        {children}
      </div>
    </div>
  </section>;
}

/** Frames the hero's event media; EventThumbnail draws the photo or activity cover. */
export function EventDetailMedia({children}: {children: ReactNode}) {
  return <div className="event-detail-media">{children}</div>;
}

export function EventDetailBodyLayout({children, host}: {children: ReactNode; host: ReactNode}) {
  return <div className="event-detail-body"><div>{children}</div><div>{host}</div></div>;
}

export function EventDetailItinerary({items}: {items: Array<{
  id: string; time: string; title: string; duration?: string; description?: ReactNode; location?: ReactNode;
}>}) {
  return <ol className="event-detail-itinerary">{items.map((item) => <li key={item.id}>
    <span>{item.time}{item.duration ? <small>{item.duration}</small> : null}</span><div><h3>{item.title}</h3>
      {item.description ? <p>{item.description}</p> : null}
      {item.location ? <p>{item.location}</p> : null}</div>
  </li>)}</ol>;
}

/** One action model, two placements; only the mobile bar is fixed. */
export function EventGuestActions({children, price, status}: {
  children: ReactNode; price: string; status: string;
}) {
  return <>
    <div className="event-guest-action">{children}<p role="status">{status}</p></div>
    <div className="event-guest-mobile"><div><strong>{price}</strong><span>{status}</span></div>{children}</div>
  </>;
}

export function EventGuestDialog({open, onClose, title, closeLabel, children}: {
  open: boolean; onClose: () => void; title: string; closeLabel: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} aria-labelledby={id} className="event-guest-dialog"
    onCancel={(event) => {event.preventDefault(); onClose();}}>
    <div className="event-guest-dialog__heading"><h2 id={id}>{title}</h2>
      <Button variant="ghost" onClick={onClose}>{closeLabel}</Button></div>
    {children}
  </dialog>;
}

export function EventDetailOrganizerPanel({
  activity,
  badge,
  claimAction,
  eyebrow,
  location,
  metrics,
  name,
  primaryAction,
}: {
  activity: ReactNode;
  badge: ReactNode;
  claimAction?: ReactNode;
  eyebrow: ReactNode;
  location: ReactNode;
  metrics: Array<{label: ReactNode; value: ReactNode}>;
  name: ReactNode;
  primaryAction: ReactNode;
}) {
  return (
    <aside className="event-detail-organizer-panel" data-reveal>
      <UiLabel>{eyebrow}</UiLabel>
      <div className="event-detail-organizer-panel__identity">
        {activity}
        <div>
          <h2>{name}</h2>
          <p>{location}</p>
        </div>
      </div>
      <div className="event-detail-organizer-panel__status">{badge}</div>
      {metrics.length ? (
        <dl className="event-detail-organizer-panel__metrics">
          {metrics.map((item, index) => (
            <div key={typeof item.label === "string" ? item.label : index}>
              <dd>{item.value}</dd>
              <dt>{item.label}</dt>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="event-detail-organizer-panel__actions">
        {primaryAction}
        {claimAction}
      </div>
    </aside>
  );
}

export function EventDetailReviewPreview({
  body,
  eyebrow,
  meta,
  title,
}: {
  body: ReactNode;
  eyebrow: ReactNode;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="event-detail-ticket__review-preview">
      <div>
        <UiLabel>{eyebrow}</UiLabel>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function EventRegistrationForm({
  children,
  className,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...props} className={classNames("event-registration", className)}>
      {children}
    </form>
  );
}

export function EventRegistrationPrivacy({children}: {children: ReactNode}) {
  return <p className="event-registration__privacy">{children}</p>;
}

export function EventRegistrationConsents({children}: {children: ReactNode}) {
  return <div className="event-registration__consents">{children}</div>;
}

export function EventRegistrationConsent(
  props: Parameters<typeof CheckboxField>[0]
) {
  return (
    <CheckboxField
      {...props}
      className={classNames("event-registration__consent", props.className)}
    />
  );
}

export function EventDetailSection({
  children,
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  variant?: "default" | "provenance" | "reviews";
}) {
  return (
    <section
      {...props}
      className={classNames(
        "event-detail-section",
        variant === "provenance" && "event-detail-section--provenance",
        variant === "reviews" && "event-detail-section--reviews",
        className
      )}
    >
      <div className="event-detail-section__inner">{children}</div>
    </section>
  );
}

export function EventDetailFactGrid({
  items,
}: {
  items: Array<{label: ReactNode; value: ReactNode}>;
}) {
  return (
    <dl className="event-detail-facts" data-reveal>
      {items.map((item, index) => (
        <div key={typeof item.label === "string" ? item.label : index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EventDetailSourceLink({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
}) {
  return <PlainLink {...props}>{children}</PlainLink>;
}

function EventDetailHeroFacts({
  items,
}: {
  items: Array<{label: ReactNode; value: ReactNode}>;
}) {
  return (
    <dl className="event-detail-ticket__facts">
      {items.map((item, index) => (
        <div key={typeof item.label === "string" ? item.label : index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
