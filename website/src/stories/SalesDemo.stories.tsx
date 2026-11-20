import type {Meta, StoryObj} from "@storybook/react-vite";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter, Route, Routes} from "react-router";
import {expect, within} from "storybook/test";
import type {SalesDemoAuth} from "../features/salesDemo/salesDemoAuth";
import type {SalesDemoApi, SalesDemoPreview} from "../features/salesDemo/salesDemoModel";
import {SalesDemoPage} from "../features/salesDemo/SalesDemoPage";
import {salesDemoCopy} from "../content/salesDemo";
import {demoEventName, demoOrganizerName} from "./fixtures/demoWorld";

// The private demo a host opens from their demo link (/demo/:invitationId/),
// as the marketing site shows it in iPhone Safari
// (tool/marketing/capture_manifest.json, host-demo-practice). The preview is
// the reviewed blueprint for the Mumbai demo world's organizer; the API and
// sign-in are fakes, so nothing reaches Firebase.
const invitationId = "evening-club-demo";
const grant = "A".repeat(43);

const preview: SalesDemoPreview = {
  schemaVersion: 1, synthetic: true, invitationId, interactiveAvailable: true, expiresAt: null,
  notice: "Sample workflow only. No real messages, charges or admission.",
  preview: {
    brandName: demoOrganizerName,
    headline: `Your demo · ${demoEventName}`,
    scenario: "A sample guest applies to your trivia night with your own questions. Review them, write the reply, then let them in at the door.",
    steps: [
      "Review a sample application, answered with your questions",
      "Write the reply they would get",
      "Let the sample guest in at the door",
      "Ask for help on the night, the way a guest would",
    ],
    retainedTools: ["Your WhatsApp group for announcements"],
    limitations: ["One sample guest; nothing is sent to anyone"],
    cta: "Open the sample to review your first applicant.",
  },
};

const unused = () => Promise.reject(new Error("The story never starts a session."));
const api: SalesDemoApi = {preview: () => Promise.resolve(preview), start: unused, getSession: unused,
  advance: unused, getSetup: unused, prepareSetup: unused};
const auth: SalesDemoAuth = {
  watch: (callback) => {
    callback({uid: "story-host", email: "host@example.test", emailVerified: true, phoneNumber: null});
    return () => undefined;
  },
  signInGoogle: () => Promise.resolve(), beginPhone: () => Promise.reject(new Error("Not in the story.")),
};

function DemoLink() {
  // The invitation link carries its grant in the fragment; the page reads it
  // once and removes it from the address.
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#grant=${grant}`);
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[`/demo/${invitationId}/`]}>
      <Routes><Route path="/demo/:invitationId/" element={<SalesDemoPage api={api} auth={auth} />} /></Routes>
    </MemoryRouter>
  </QueryClientProvider>;
}

const meta = {
  title: "Marketing Website/Sales demo",
  parameters: {layout: "fullscreen"},
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The demo link opened by the invited host, signed in and ready to start. */
export const DemoLinkReady: Story = {
  render: () => <DemoLink />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("heading", {level: 1, name: preview.preview.headline})).toBeVisible();
    await expect(canvas.getByRole("button", {name: salesDemoCopy.openInteractiveExample})).toBeEnabled();
  },
};
