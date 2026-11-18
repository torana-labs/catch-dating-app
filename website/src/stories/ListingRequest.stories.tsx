import type {Meta, StoryObj} from "@storybook/react-vite";
import {MemoryRouter} from "react-router";
import {expect, userEvent, within} from "storybook/test";
import {listingRequestCopy as copy} from "@content/listingRequest";
import {ListingPolicyPage} from "../features/listingRequests/ListingPolicyPage";
import {ListingRequestPage} from "../features/listingRequests/ListingRequestPage";
import type {ListingRequestSubmission} from "../shared/api/listingRequest";

// The listing request form (/listings/request/) and the two draft policies.
// The fictional organiser id stands in for a listing link; the stories'
// submission only resolves with a receipt, nothing is sent.
const viewports = {
  requestPhone: {name: "Listing request · phone 390", styles: {width: "390px", height: "1100px"}, type: "mobile"},
  requestDesktop: {name: "Listing request · desktop 1280", styles: {width: "1280px", height: "1000px"}, type: "desktop"},
} as const;
const phone = {viewport: {value: "requestPhone", isRotated: false}};
const desktop = {viewport: {value: "requestDesktop", isRotated: false}};

const receiptSubmission: ListingRequestSubmission = {
  reset: () => undefined,
  submit: async (body) => ({status: "sent", receipt: {requestId: `lr-${"a".repeat(40)}`, reference: "LR-K7Q2M9TX",
    requestType: body.requestType, isNew: true, ackDueAt: "2026-11-19T06:00:00.000Z", actionDueAt: "2026-11-19T06:00:00.000Z",
    resolveDueAt: "2026-11-25T06:00:00.000Z"}}),
};

const listingLink = "/listings/request/?organizer=lantern-lane-social";

function Page({entry}: {entry: string}) {
  return <MemoryRouter initialEntries={[entry]}><ListingRequestPage submission={receiptSubmission} /></MemoryRouter>;
}

const meta = {
  title: "Marketing Website/Listing requests",
  parameters: {
    layout: "fullscreen",
    viewport: {options: viewports},
    catchRouteContract: {path: "design/website/routes.json"},
    catchComponentRegistry: {path: "design/website/components.json"},
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function fillRemoveDetails(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole("textbox", {name: copy.detailsStep.name.label}), "Asha Verma");
  await userEvent.click(canvas.getByRole("radio", {name: copy.roles.owner}));
  await userEvent.type(canvas.getByRole("textbox", {name: new RegExp(copy.detailsStep.email.label)}), "asha@lanternlane.example");
  await userEvent.click(canvas.getByRole("radio", {name: copy.proof.domainEmail}));
  await userEvent.type(canvas.getByRole("textbox", {name: copy.proof.domain.label}), "lanternlane.example");
  await userEvent.click(canvas.getByRole("button", {name: copy.detailsStep.continue}));
}

/** Step 1: the fixed menu with each type's timeline, opened from an organiser page. */
export const ChooseType: Story = {
  name: "Request · choose a type",
  globals: desktop,
  parameters: {
    a11y: {test: "error"},
    catchRoute: {
      id: "listing_request", path: "/listings/request/",
      reviewStates: ["type", "details", "declarations", "sent"],
      stateCoverage: {storybook: ["type", "details", "declarations", "sent"], manual: []},
    },
    catchComponent: {id: "route_listing_request", routeIds: ["listing_request"], states: ["type"]},
  },
  render: () => <Page entry={listingLink} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("radio")).toHaveLength(8);
    await expect(canvas.getByRole("radio", {name: new RegExp(copy.types.removeAndDoNotList.label)})).toBeVisible();
  },
};

/** Step 2 for "Remove and don't list again": the target prefilled from the listing link. */
export const Details: Story = {
  name: "Request · details",
  globals: phone,
  parameters: {
    a11y: {test: "error"},
    catchComponent: {id: "route_listing_request", routeIds: ["listing_request"], states: ["details"]},
  },
  render: () => <Page entry={`${listingLink}&type=removeAndDoNotList`} />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(copy.detailsStep.target.organizer)).toBeVisible();
    await expect(canvas.queryByRole("textbox", {name: copy.detailsStep.target.label})).toBeNull();
  },
};

/** Step 3: the fixed declarations, after the details are filled in. */
export const Declarations: Story = {
  name: "Request · declarations",
  globals: phone,
  parameters: {
    a11y: {test: "error"},
    catchComponent: {id: "route_listing_request", routeIds: ["listing_request"], states: ["declarations"]},
  },
  render: () => <Page entry={`${listingLink}&type=removeAndDoNotList`} />,
  play: async ({canvasElement}) => {
    await fillRemoveDetails(canvasElement);
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("checkbox")).toHaveLength(3);
  },
};

/** After Send: the reference and what happens next. */
export const Sent: Story = {
  name: "Request · sent",
  globals: desktop,
  parameters: {
    a11y: {test: "error"},
    catchComponent: {id: "route_listing_request", routeIds: ["listing_request"], states: ["sent"]},
  },
  render: () => <Page entry={`${listingLink}&type=removeAndDoNotList`} />,
  play: async ({canvasElement}) => {
    await fillRemoveDetails(canvasElement);
    const canvas = within(canvasElement);
    for (const box of canvas.getAllByRole("checkbox")) await userEvent.click(box);
    await userEvent.click(canvas.getByRole("button", {name: copy.declarationsStep.send}));
    await expect(await canvas.findByText("Your reference: LR-K7Q2M9TX")).toBeVisible();
  },
};

/** The draft Listing Policy under its banner. */
export const ListingPolicyDraft: Story = {
  name: "Listing Policy · draft",
  globals: desktop,
  parameters: {
    a11y: {test: "error"},
    catchRoute: {id: "listing_policy", path: "/listings/policy/", reviewStates: ["draft"], stateCoverage: {storybook: ["draft"], manual: []}},
    catchComponent: {id: "route_listing_policies", routeIds: ["listing_policy"], states: ["draft"]},
  },
  render: () => <ListingPolicyPage policy="listingPolicy" />,
};

/** The draft Notice and Takedown Policy, with the Grievance Officer section. */
export const TakedownPolicyDraft: Story = {
  name: "Notice and Takedown Policy · draft",
  globals: phone,
  parameters: {
    a11y: {test: "error"},
    catchRoute: {id: "takedown_policy", path: "/listings/notice-and-takedown/", reviewStates: ["draft"], stateCoverage: {storybook: ["draft"], manual: []}},
    catchComponent: {id: "route_listing_policies", routeIds: ["takedown_policy"], states: ["draft"]},
  },
  render: () => <ListingPolicyPage policy="takedownPolicy" />,
};
