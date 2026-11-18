import type {Meta, StoryObj} from "@storybook/react-vite";
import {expect, userEvent, within} from "storybook/test";
import {applyBrand} from "@content/brand";
import runClubs from "@content/playbook/pages/host/run-clubs.json";
import hostWalkthrough from "@content/playbook/pages/host/walkthrough.json";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {validatedPlaybookPage} from "@content/playbook/playbookContract";
import {marketingCaptures} from "../app/marketingCaptures";
import {PlaybookPage} from "../features/playbook/PlaybookPage";
import {PageShell} from "../shared/site";

const meta = {
  title: "Marketing Website/Playbook lead forms",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const runClubsPage = applyBrand(validatedPlaybookPage(runClubs));
const guideForm = runClubsPage.sections.flatMap((section) => section.type === "cta" && section.leadForm ? [section.leadForm] : [])[0];
const walkthroughPage = applyBrand(validatedPlaybookPage(hostWalkthrough));
const walkthroughForm = walkthroughPage.sections.flatMap((section) => section.type === "split" && section.leadForm ? [section.leadForm] : [])[0];

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

/** /host/walkthrough/ at rest: the indigo split, what the walkthrough covers, and the request form in the second column. */
export const WalkthroughIdle1280: Story = {
  name: "/host/walkthrough/ walkthrough form · 1280",
  render: () => <PlaybookAt page={walkthroughPage} width={1280} />,
  play: async ({canvasElement}) => {
    await expect(within(canvasElement).getByRole("form", {name: walkthroughForm.submitLabel})).toBeInTheDocument();
  },
};

export const WalkthroughIdle390: Story = {
  name: "/host/walkthrough/ walkthrough form · 390",
  render: () => <PlaybookAt page={walkthroughPage} width={390} />,
};

/** Sent: a walkthrough lead with the time asked for, and the thanks in the form's place. */
export const WalkthroughSent1280: Story = {
  name: "/host/walkthrough/ walkthrough form, sent · 1280",
  beforeEach: answerLeads("accepted"),
  render: () => <PlaybookAt page={walkthroughPage} width={1280} />,
  play: async ({canvasElement}) => {
    const form = within(within(canvasElement).getByRole("form", {name: walkthroughForm.submitLabel}));
    const answers = ["Asha Rao", "Sunday Runners", "A run club, three chapters", "Tue 4pm"];
    for (const [index, field] of (walkthroughForm.fields ?? []).entries()) {
      await userEvent.type(form.getByRole("textbox", {name: new RegExp(field.label, "u")}), answers[index]);
    }
    await userEvent.type(form.getByRole("textbox", {name: new RegExp(walkthroughForm.label, "u")}), "98765 43210");
    await userEvent.click(form.getByRole("button", {name: walkthroughForm.submitLabel}));
    await expect(await within(canvasElement).findByText(playbookCopy.leadForm.sent.walkthrough)).toBeInTheDocument();
  },
};

export const WalkthroughSent390: Story = {
  ...WalkthroughSent1280,
  name: "/host/walkthrough/ walkthrough form, sent · 390",
  render: () => <PlaybookAt page={walkthroughPage} width={390} />,
};
