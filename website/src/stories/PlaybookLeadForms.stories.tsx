import type {Meta, StoryObj} from "@storybook/react-vite";
import {useState} from "react";
import {expect, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import hostWalkthrough from "@content/playbook/pages/host/walkthrough.json";
import refer from "@content/playbook/pages/resources/refer.json";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {referralSignInCopy} from "@content/referral";
import {signInCopy} from "@content/account";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import type {ReferralAccountUser, ReferralOwnedOrganizer} from "../features/referral/referralAccountModel";
import {provideReferralAccountDeps, type ReferralAccountDeps} from "../features/referral/useReferralAccountController";
import {PageShell} from "../shared/site";
import {walkthroughBookingCopy} from "@content/walkthroughBooking";
import {provideWalkthroughDeps, type WalkthroughDeps} from "../features/walkthroughs/walkthroughClientContext";
import {scriptedWalkthroughClient, walkthroughNoSlots} from "./fixtures/walkthroughBooking";

const meta = {
  title: "Marketing Website/Playbook lead forms",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runClubsPage = applyBrand(validatedPlaybookPage(runClubs));
const guideForm = runClubsPage.sections.flatMap((section) => section.type === "cta" && section.leadForm ? [section.leadForm] : [])[0];
const walkthroughPage = applyBrand(validatedPlaybookPage(hostWalkthrough));
const walkthroughForm = walkthroughPage.sections.flatMap((section) => section.type === "split" && section.leadForm ? [section.leadForm] : [])[0];

const referPage = applyBrand(validatedPlaybookPage(refer));
const referralForm = referPage.sections.flatMap((section) => section.type === "cta" && section.leadForm ? [section.leadForm] : [])[0];

function PlaybookAt({width, page = runClubsPage}: {width: 390 | 1280; page?: typeof runClubsPage}) {
  return (
    <div style={{margin: "0 auto", width}}>
      <PageShell pageClassName="home-page">
        <PlaybookPage captures={marketingCaptures} page={page} />
      </PageShell>
    </div>
  );
}

/**
 * /host/walkthrough/ with its slot picker answered by the story: open times
 * draw the picker; no open time draws the request form under a line saying so.
 */
function WalkthroughAt({width, times}: {width: 390 | 1280; times: "open" | "none"}) {
  const [deps] = useState<WalkthroughDeps>(() => ({
    client: scriptedWalkthroughClient(times === "none" ? {slots: [walkthroughNoSlots]} : {}).client,
    timeZone: "Asia/Kolkata",
  }));
  return <>{provideWalkthroughDeps(deps, <PlaybookAt page={walkthroughPage} width={width} />)}</>;
}

/** A fictional host signed in on /refer/: their phone and the host page they own. */
const signedInHost: ReferralAccountUser = {uid: "story-host", phoneNumber: "+919876543210", isAnonymous: false};
const ownedPage: ReferralOwnedOrganizer = {organizerId: "story-organizer", name: "Kestrel Supper Club"};

/** /refer/ with its sign-in answered by the story: signed out, or signed in owning the given host pages. */
function ReferAt({width, owned}: {width: 390 | 1280; owned?: ReferralOwnedOrganizer[]}) {
  const [deps] = useState<ReferralAccountDeps>(() => ({
    seenSignedIn: () => Boolean(owned),
    watchUser: (callback) => {
      callback(owned ? signedInHost : null);
      return () => undefined;
    },
    ownedOrganizers: async () => owned ?? [],
  }));
  return <>{provideReferralAccountDeps(deps, <PlaybookAt page={referPage} width={width} />)}</>;
}

const nominate = (canvasElement: HTMLElement) => within(canvasElement.querySelector<HTMLElement>("#nominate")!);

/**
 * Storybook has no lead intake: the stories answer the site's lead posts
 * themselves (accepted or refused), and leave every other request alone.
 */
const answerLeads = (answer: "accepted" | "failed") => () => {
  const original = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as {requestKind?: string} : {};
    if (!String(input).includes("/api/join-waitlist") || !body.requestKind) return original(input, init);
    return answer === "accepted" ?
      new Response(JSON.stringify({ok: true, alreadyJoined: false, lead: {leadId: "0".repeat(64), requestKind: body.requestKind, isNew: true}}), {status: 200}) :
      new Response(JSON.stringify({error: "Unavailable"}), {status: 503});
  }) as typeof fetch;
  return () => {
    window.fetch = original;
  };
};

async function sendGuide(canvasElement: HTMLElement) {
  const form = within(within(canvasElement).getByRole("form", {name: guideForm.submitLabel}));
  // The phone lane loads on first use; type once its country chip is there.
  await form.findByRole("button", {name: /Country code/u});
  await userEvent.type(form.getByRole("textbox", {name: new RegExp(guideForm.label, "u")}), "98765 43210");
  await userEvent.click(form.getByRole("button", {name: guideForm.submitLabel}));
}

/** The run-clubs closing band at rest: the trial, the WhatsApp action, then the number and Send the guide. */
export const GuideIdle1280: Story = {
  name: "/host/run-clubs/ setup guide form · 1280",
  render: () => <PlaybookAt width={1280} />,
  play: async ({canvasElement}) => {
    await expect(within(canvasElement).getByRole("form", {name: guideForm.submitLabel})).toBeInTheDocument();
  },
};

export const GuideIdle390: Story = {
  name: "/host/run-clubs/ setup guide form · 390",
  render: () => <PlaybookAt width={390} />,
};

/** Sent: a guide lead, and the thanks in the form's place. */
export const GuideSent1280: Story = {
  name: "/host/run-clubs/ setup guide form, sent · 1280",
  beforeEach: answerLeads("accepted"),
  render: () => <PlaybookAt width={1280} />,
  play: async ({canvasElement}) => {
    await sendGuide(canvasElement);
    await expect(await within(canvasElement).findByText(playbookCopy.leadForm.sent.guide)).toBeInTheDocument();
  },
};

export const GuideSent390: Story = {
  ...GuideSent1280,
  name: "/host/run-clubs/ setup guide form, sent · 390",
  render: () => <PlaybookAt width={390} />,
};

/** Failed: the send's words, and the button offers to try again with the same request. */
export const GuideFailed1280: Story = {
  name: "/host/run-clubs/ setup guide form, failed · 1280",
  beforeEach: answerLeads("failed"),
  render: () => <PlaybookAt width={1280} />,
  play: async ({canvasElement}) => {
    await sendGuide(canvasElement);
    await expect(await within(canvasElement).findByRole("button", {name: playbookCopy.leadForm.retry})).toBeInTheDocument();
  },
};

export const GuideFailed390: Story = {
  ...GuideFailed1280,
  name: "/host/run-clubs/ setup guide form, failed · 390",
  render: () => <PlaybookAt width={390} />,
};

/** /host/walkthrough/ while times are open: the indigo split, what the walkthrough covers, and the slot picker in the second column. */
export const WalkthroughPicker1280: Story = {
  name: "/host/walkthrough/ slot picker · 1280",
  render: () => <WalkthroughAt times="open" width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("radiogroup", {name: walkthroughBookingCopy.day})).toBeInTheDocument();
    await expect(canvas.queryByRole("form", {name: walkthroughForm.submitLabel})).toBeNull();
  },
};

export const WalkthroughPicker390: Story = {
  ...WalkthroughPicker1280,
  name: "/host/walkthrough/ slot picker · 390",
  render: () => <WalkthroughAt times="open" width={390} />,
};

/** /host/walkthrough/ with no open time: the line saying so, and the request form in the second column. */
export const WalkthroughIdle1280: Story = {
  name: "/host/walkthrough/ walkthrough form · 1280",
  render: () => <WalkthroughAt times="none" width={1280} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(walkthroughBookingCopy.problems.noSlots)).toBeInTheDocument();
    await expect(canvas.getByRole("form", {name: walkthroughForm.submitLabel})).toBeInTheDocument();
  },
};

export const WalkthroughIdle390: Story = {
  ...WalkthroughIdle1280,
  name: "/host/walkthrough/ walkthrough form · 390",
  render: () => <WalkthroughAt times="none" width={390} />,
};

/** Sent, with no open time: a walkthrough lead with the time asked for, and the thanks in the form's place. */
export const WalkthroughSent1280: Story = {
  name: "/host/walkthrough/ walkthrough form, sent · 1280",
  beforeEach: answerLeads("accepted"),
  render: () => <WalkthroughAt times="none" width={1280} />,
  play: async ({canvasElement}) => {
    const form = within(await within(canvasElement).findByRole("form", {name: walkthroughForm.submitLabel}));
    const answers = ["Asha Rao", "Sunday Runners", "A run club, three chapters", "Tue 4pm"];
    for (const [index, field] of (walkthroughForm.fields ?? []).entries()) {
      await userEvent.type(form.getByRole("textbox", {name: new RegExp(field.label, "u")}), answers[index]);
    }
    await form.findByRole("button", {name: /Country code/u});
    await userEvent.type(form.getByRole("textbox", {name: new RegExp(walkthroughForm.label, "u")}), "98765 43210");
    await userEvent.click(form.getByRole("button", {name: walkthroughForm.submitLabel}));
    await expect(await within(canvasElement).findByText(playbookCopy.leadForm.sent.walkthrough)).toBeInTheDocument();
  },
};

export const WalkthroughSent390: Story = {
  ...WalkthroughSent1280,
  name: "/host/walkthrough/ walkthrough form, sent · 390",
  render: () => <WalkthroughAt times="none" width={390} />,
};

/** /refer/ signed out: what credit needs, the sign-in button, and the referral form, which still sends. */
export const ReferSignedOut1280: Story = {
  name: "/refer/ referral form, signed out · 1280",
  render: () => <ReferAt width={1280} />,
  play: async ({canvasElement}) => {
    const band = nominate(canvasElement);
    await expect(await band.findByText(referralSignInCopy.signedOut)).toBeInTheDocument();
    await expect(band.getByRole("button", {name: referralSignInCopy.signIn})).toBeInTheDocument();
    await expect(band.getByRole("form", {name: referralForm.submitLabel})).toBeInTheDocument();
  },
};

export const ReferSignedOut390: Story = {
  ...ReferSignedOut1280,
  name: "/refer/ referral form, signed out · 390",
  render: () => <ReferAt width={390} />,
};

/** "Sign in with your Catch Host number" opens the site's one sign-in sheet in place. */
export const ReferSignInOpen1280: Story = {
  name: "/refer/ referral form, sign-in open · 1280",
  render: () => <ReferAt width={1280} />,
  play: async ({canvasElement}) => {
    await userEvent.click(await nominate(canvasElement).findByRole("button", {name: referralSignInCopy.signIn}));
    await expect(await within(canvasElement.ownerDocument.body).findByRole("button", {name: signInCopy.sendCode})).toBeVisible();
  },
};

export const ReferSignInOpen390: Story = {
  ...ReferSignInOpen1280,
  name: "/refer/ referral form, sign-in open · 390",
  render: () => <ReferAt width={390} />,
};

/** Signed in as the owner of a live host page: named by that page, and the referral is credited to it. */
export const ReferSignedIn1280: Story = {
  name: "/refer/ referral form, signed in · 1280",
  render: () => <ReferAt owned={[ownedPage]} width={1280} />,
  play: async ({canvasElement}) => {
    const band = nominate(canvasElement);
    await expect(await band.findByText(`Signed in as ${ownedPage.name}`)).toBeInTheDocument();
    await expect(band.getByText(referralSignInCopy.owner)).toBeInTheDocument();
  },
};

export const ReferSignedIn390: Story = {
  ...ReferSignedIn1280,
  name: "/refer/ referral form, signed in · 390",
  render: () => <ReferAt owned={[ownedPage]} width={390} />,
};

/** Signed in with a number that owns no live host page: the form sends, but says it won't be credited. */
export const ReferSignedInNotOwner390: Story = {
  name: "/refer/ referral form, signed in without a host page · 390",
  render: () => <ReferAt owned={[]} width={390} />,
  play: async ({canvasElement}) => {
    await expect(await nominate(canvasElement).findByText(referralSignInCopy.notOwner)).toBeInTheDocument();
  },
};
