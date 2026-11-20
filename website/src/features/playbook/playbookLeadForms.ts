import {nightPlanTryItNode} from "../tryIt/NightPlanTryIt";
import {playbookTryItTool, type TryItToolKind} from "../tryIt/tryItModel";
import {referralSignInNode} from "../referral/ReferralSignIn";
import {tryItToolNode} from "../tryIt/TryItTool";
import {playbookLeadFormNode} from "./PlaybookLeadForm";
import type {PlaybookLeadFormProps, PlaybookLeadFormSlots} from "./usePlaybookPageController";

/** The plan-a-night tool (features/tryIt/NightPlanTryIt.tsx), which asks for a format and a head count instead of a link. */
const isNightTool = (tool: TryItToolKind): tool is Extract<TryItToolKind, "night"> => (tool as string) === "night";

/**
 * A tool form's slot: the page's try-it tool, running its command, when the
 * page has one whose command is website-ready (tryItModel:
 * playbookTryItTools, websiteReadyTryItCommands); otherwise nothing. A link
 * tool (features/tryIt) reads a link (`input` url); the plan-a-night tool
 * (`input` text) draws its own fields. Never a phone number.
 */
function playbookToolFormNode({form, pageId, sectionId, placement}: PlaybookLeadFormProps) {
  const tool = (form.input ?? "tel") === "tel" ? null : playbookTryItTool(pageId);
  if (!tool) return null;
  return isNightTool(tool) ? nightPlanTryItNode({form, pageId, sectionId}) : tryItToolNode({form, tool, placement, pageId, sectionId});
}

/** The /refer/ form: the referral lead form with its sign-in (features/referral) above it. */
function playbookReferralFormNode(props: PlaybookLeadFormProps) {
  return playbookLeadFormNode(props, referralSignInNode());
}

/**
 * The lead forms that have a backend, by request kind: send me the setup
 * guide, list your space, get a demo link, ask for a walkthrough and refer a
 * host post to the website lead intake (/api/join-waitlist), the referral
 * with the sign-in that credits it above (features/referral); a tool form
 * runs its page's try-it command. Kinds left out keep to the page's
 * WhatsApp actions.
 */
export const playbookLeadForms: PlaybookLeadFormSlots = {
  guide: playbookLeadFormNode,
  venue: playbookLeadFormNode,
  demo: playbookLeadFormNode,
  walkthrough: playbookLeadFormNode,
  tool: playbookToolFormNode,
  referral: playbookReferralFormNode,
};
