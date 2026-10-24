import {CatchBadge} from "@catch/web-ui";
import {Children, isValidElement, type ComponentProps, type ReactNode} from "react";
import {badgeLabel} from "./feedback";
import {Form} from "./forms";
import {PlainButton} from "./actions";
export function ExplorePageLayout(props: ComponentProps<"div">) {return <div {...props} className="consumer-home explore-page" />;}
export function ExploreIntro(props: ComponentProps<"section">) {return <section {...props} className="explore-intro" />;}
export function ExploreSearchForm(props: ComponentProps<typeof Form>) {return <Form {...props} className="explore-search" />;}
export function ExploreToolbar(props: ComponentProps<"div">) {return <div {...props} className="explore-toolbar" />;}
export function ExploreExperience(props: ComponentProps<"details">) {return <details {...props} className="explore-experience" />;}
export function ExploreResults(props: ComponentProps<"section">) {return <section {...props} className="explore-results" />;}
export function ExploreResultsHeading(props: ComponentProps<"div">) {return <div {...props} className="explore-results-heading" />;}
/**
 * Interim: the last callers sit in files other tasks hold, plus one whose
 * title explains the badge. The brand CatchBadge; element children become its icon.
 */
export function ExploreBadge({children, title}: {children: ReactNode; title?: string}) {
  const parts = Children.toArray(children);
  const icon = parts.find((part) => isValidElement(part));
  const badge = <CatchBadge tone="brand" icon={icon} label={badgeLabel(parts.filter((part) => !isValidElement(part)))} />;
  return title ? <span title={title}>{badge}</span> : badge;
}
export function ExploreExperienceFilter(props: ComponentProps<typeof PlainButton>) {return <PlainButton {...props} className="explore-experience-filter" />;}
export function ExploreFooterInvite(props: ComponentProps<"section">) {return <section {...props} className="explore-footer-invite" />;}
