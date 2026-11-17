import {playbookLeadFormNode} from "./PlaybookLeadForm";
import type {PlaybookLeadFormSlots} from "./usePlaybookPageController";

/**
 * The lead forms that have a backend, by request kind: send me the setup
 * guide, list your space and get a demo link post to the website lead intake
 * (/api/join-waitlist). Kinds left out keep to the page's WhatsApp actions.
 */
export const playbookLeadForms: PlaybookLeadFormSlots = {
  guide: playbookLeadFormNode,
  venue: playbookLeadFormNode,
  demo: playbookLeadFormNode,
};
