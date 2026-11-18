import type {CatchBandAction, CatchBandLink} from "@catch/web-ui";
import {useMemo, type ReactNode} from "react";
import type {
  PlaybookAction,
  PlaybookDestination,
  PlaybookLeadForm,
  PlaybookPageDocument,
} from "../../content/playbook/playbookContract.ts";
import {slugForTracking, trackSiteCtaClick} from "../../shared/site/siteTracking";
import {playbookHref} from "./playbookHrefs.ts";

/** What a lead form slot is given: the form's words and where it sits, for its tagged capture. */
export interface PlaybookLeadFormProps {
  readonly form: PlaybookLeadForm;
  readonly pageId: string;
  readonly sectionId: string;
}

/**
 * The lead forms a page may show, by the request kind its content names
 * (`guide`). A form renders only when its kind's slot is filled and the slot
 * draws it, so no page shows a form that submits to nowhere; the page's
 * actions carry the WhatsApp way beside it, or alone. ./playbookLeadForms.ts
 * fills the slots of the kinds the website lead intake takes.
 */
export type PlaybookLeadFormSlots = {readonly [Kind in PlaybookLeadForm["requestKind"]]?: (props: PlaybookLeadFormProps) => ReactNode};

/** The analytics label of one action: the page, the section and the action's words. */
export function playbookCtaLabel(pageId: string, sectionId: string, label: string): string {
  return ["playbook", slugForTracking(pageId), slugForTracking(sectionId), slugForTracking(label)].join("_");
}

export interface PlaybookPageController {
  readonly href: (to: PlaybookDestination) => string;
  /** An action as the kit's band button: its link, its weight, and its tagged click. WhatsApp opens in a new tab. */
  readonly action: (item: PlaybookAction, sectionId: string) => CatchBandAction;
  readonly actions: (items: readonly PlaybookAction[] | undefined, sectionId: string) => CatchBandAction[] | undefined;
  /** An action drawn as a plain link, where the kit has no click to tag. */
  readonly link: (item: PlaybookAction) => CatchBandLink;
  /** The section's lead form, or null while its kind's slot is empty or cannot draw it. */
  readonly leadForm: (form: PlaybookLeadForm | undefined, sectionId: string) => ReactNode;
}

/** CTA analytics, route and WhatsApp destinations and lead-form slots for one page. */
export function usePlaybookPageController(page: PlaybookPageDocument, leadForms: PlaybookLeadFormSlots = {}): PlaybookPageController {
  return useMemo(() => {
    const action = (item: PlaybookAction, sectionId: string): CatchBandAction => {
      const href = playbookHref(item.to);
      return {
        label: item.label,
        href,
        newTab: "kind" in item.to,
        onPressed: () => trackSiteCtaClick(playbookCtaLabel(page.id, sectionId, item.label), href),
        ...(item.emphasis ? {variant: item.emphasis} : {}),
      };
    };
    return {
      href: playbookHref,
      action,
      actions: (items, sectionId) => items?.map((item) => action(item, sectionId)),
      link: (item) => ({label: item.label, href: playbookHref(item.to)}),
      leadForm: (form, sectionId) => {
        const slot = form ? leadForms[form.requestKind] : undefined;
        return form && slot ? slot({form, pageId: page.id, sectionId}) : null;
      },
    };
  }, [leadForms, page.id]);
}
