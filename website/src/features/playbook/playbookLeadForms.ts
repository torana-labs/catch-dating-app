import {guestImportToolNode} from "../guestImportTryIt/GuestImportTool";
import {pastSalesToolNode} from "../pastSalesTryIt/PastSalesTool";
import {nightPlanTryItNode} from "../tryIt/NightPlanTryIt";
import {playbookTryItTool, websiteReadyTryItCommands} from "../tryIt/tryItModel";
import {referralSignInNode} from "../referral/ReferralSignIn";
import {tryItToolNode} from "../tryIt/TryItTool";
import {playbookLeadFormNode} from "./PlaybookLeadForm";
import type {PlaybookLeadFormProps, PlaybookLeadFormSlots} from "./usePlaybookPageController";

/**
 * A tool form's slot: the page's try-it tool (features/tryIt), running its
 * command, when the page has one whose command is website-ready
 * (tryItModel: playbookTryItTools, websiteReadyTryItCommands); otherwise
 * nothing. A tool form reads a link (`input` url or text) or, for the guest
 * list tool (features/guestImportTryIt) and Reports' export upload
 * (features/pastSalesTryIt), a file; the plan-a-night tool (`input` text)
 * draws its own format and head count fields. Never a number. `ready` is
 * the website-ready commands (websiteReadyTryItCommands).
 */
const toolFormSlot = (ready: readonly string[]) => ({form, pageId, sectionId, placement}: PlaybookLeadFormProps) => {
  const tool = (form.input ?? "tel") === "tel" ? null : playbookTryItTool(pageId, ready);
  if (tool === "guests") return form.input === "file" ? guestImportToolNode({form, pageId, sectionId}) : null;
  if (tool === "report") return form.input === "file" ? pastSalesToolNode({form, placement, pageId, sectionId}) : null;
  if (tool === "night") return form.input === "text" ? nightPlanTryItNode({form, pageId, sectionId}) : null;
  return tool && form.input !== "file" ? tryItToolNode({form, tool, placement, pageId, sectionId}) : null;
};
const playbookToolFormNode = toolFormSlot(websiteReadyTryItCommands);

/**
 * The tool slot on the Forms page's owner preview (?tryit=forms,
 * ./usePlaybookTryItReveal.ts): form.import-from-link counts as website-ready
 * there, and only there, so its hidden tool can be tried on the live site
 * before it ships. Every other tool is as playbookLeadForms draws it.
 */
export const playbookFormsPreviewToolSlot = toolFormSlot([...websiteReadyTryItCommands, "form.import-from-link"]);

/** The /refer/ form: the referral lead form with its sign-in (features/referral) above it. */
function playbookReferralFormNode(props: PlaybookLeadFormProps) {
  return playbookLeadFormNode(props, referralSignInNode());
}

/**
 * The lead forms that have a backend, by request kind: send me the setup
 * guide, list your space, get a demo link, ask for a walkthrough, text me the
 * app link and refer a host post to the website lead intake (/api/join-waitlist), the referral
 * with the sign-in that credits it above (features/referral); a tool form
 * runs its page's try-it command. Kinds left out keep to the page's
 * WhatsApp actions.
 */
export const playbookLeadForms: PlaybookLeadFormSlots = {
  guide: playbookLeadFormNode,
  venue: playbookLeadFormNode,
  demo: playbookLeadFormNode,
  walkthrough: playbookLeadFormNode,
  app_link: playbookLeadFormNode,
  tool: playbookToolFormNode,
  referral: playbookReferralFormNode,
};
