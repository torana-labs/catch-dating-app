import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  draftFromTerms,
  platformTermsDiff,
} from "../features/commercial-terms/controllers/commercialTermsForm";
import type {
  CommercialTermsController,
} from "../features/commercial-terms/controllers/useCommercialTermsController";
import {CommercialTermsWorkspace} from "../features/commercial-terms/ui/CommercialTermsScreen";
import {
  draftFromPolicy,
  requiredConfirmations,
  routingDiff,
  type RoutingPolicy,
} from "../features/payment-routing/controllers/paymentRoutingForm";
import type {
  PaymentRoutingController,
} from "../features/payment-routing/controllers/usePaymentRoutingController";
import {PaymentRoutingWorkspace} from "../features/payment-routing/ui/PaymentRoutingScreen";
import type {CommercialTerms} from "../generated/contracts/commercialTerms";
import {ownerDecisionCommercialTerms} from "../shared/domain/commercialTermsDecision";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";

const meta = {
  title: "Admin Dashboard/Finance settings",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {
  // Storybook preview only; behaviour is covered by the controller tests.
};

const ownerTerms = ownerDecisionCommercialTerms as CommercialTerms;
const savedAt = Date.UTC(2026, 9, 30, 6, 30);

const platformController: CommercialTermsController = {
  scope: "platform",
  organizerId: null,
  canManage: true,
  listing: {
    termsId: "platform",
    organizerId: null,
    organizerName: null,
    platform: {revision: 2, terms: {...ownerTerms, commission: {
      ...ownerTerms.commission, rateBasisPoints: 450}},
    reason: "Festive season pilot rate", updatedByUid: "finance-lead",
    updatedAtMillis: savedAt},
    organizer: null,
    effectiveTerms: ownerTerms,
    history: [
      {revision: 2, terms: {...ownerTerms, commission: {
        ...ownerTerms.commission, rateBasisPoints: 450}},
      reason: "Festive season pilot rate", actorUid: "finance-lead",
      createdAtMillis: savedAt},
      {revision: 1, terms: ownerTerms,
        reason: "Owner decision 2026-10-30: membership money flow and commercial terms",
        actorUid: "admin-owner", createdAtMillis: savedAt - 3_600_000},
    ],
    historyComplete: true,
    overrides: [{organizerId: "sample-run-club",
      organizerName: "Bandra Sunrise Runners", revision: 1,
      terms: {commission: {rateBasisPoints: 300}, trial: {days: 60}},
      reason: "Founding host rate", updatedAtMillis: savedAt}],
    overridesComplete: true,
    organizerMatches: [],
  },
  loadState: "ready",
  loadError: null,
  editor: null,
  isSaving: false,
  searchText: "supper",
  searchState: "ready",
  searchMatches: [{organizerId: "sample-supper-club",
    organizerName: "Indiranagar Supper Club", cityName: "Bengaluru"}],
  refresh: noop,
  startEdit: noop,
  startFromOwnerDecision: noop,
  cancelEdit: noop,
  setField: noop,
  setInherited: noop,
  setReason: noop,
  review: () => true,
  backToEdit: noop,
  save: async () => true,
  setSearchText: noop,
  search: noop,
};

const unsavedPreviewController: CommercialTermsController = {
  ...platformController,
  listing: {...platformController.listing!, platform: null,
    effectiveTerms: null, history: [], overrides: []},
  searchText: "",
  searchState: "idle",
  searchMatches: [],
  editor: {
    baseRevision: 0,
    draft: draftFromTerms(ownerTerms),
    reason: "Owner decision 2026-10-30: membership money flow and commercial terms",
    errors: [],
    preview: platformTermsDiff(null, ownerTerms),
    unconfirmed: null,
  },
};

const organizerController: CommercialTermsController = {
  ...platformController,
  scope: "organizer",
  organizerId: "sample-run-club",
  listing: {...platformController.listing!,
    termsId: `org_${"a".repeat(64)}`,
    organizerId: "sample-run-club",
    organizerName: "Bandra Sunrise Runners",
    organizer: {revision: 1, terms: {commission: {rateBasisPoints: 300},
      trial: {days: 60}}, reason: "Founding host rate",
    updatedByUid: "finance-lead", updatedAtMillis: savedAt},
    history: [{revision: 1, terms: {commission: {rateBasisPoints: 300},
      trial: {days: 60}}, reason: "Founding host rate",
    actorUid: "finance-lead", createdAtMillis: savedAt}],
  },
  searchState: "idle",
  searchMatches: [],
};

const routingPolicy: RoutingPolicy = {
  policyId: "app",
  organizerId: null,
  revision: 3,
  formFee: {route: "razorpayOAuth", mode: "live", currency: "INR",
    merchantCountry: "IN"},
  eventAdmission: {route: "razorpayOAuth", mode: "live", currency: "INR",
    merchantCountry: "IN"},
  hostMembership: null,
  updatedAtMillis: savedAt,
};

const routingController: PaymentRoutingController = {
  canManage: true,
  policy: routingPolicy,
  loadState: "ready",
  loadError: null,
  editor: null,
  isSaving: false,
  confirmed: false,
  refresh: noop,
  startEdit: noop,
  cancelEdit: noop,
  setPurpose: noop,
  review: () => true,
  backToEdit: noop,
  setTyped: noop,
  save: async () => true,
};

const routeDraft = {...draftFromPolicy(routingPolicy),
  hostMembership: {route: "razorpayRoute" as const, mode: "live" as const}};
const routingPreviewController: PaymentRoutingController = {
  ...routingController,
  editor: {
    base: routingPolicy,
    draft: routeDraft,
    preview: routingDiff(routingPolicy, routeDraft),
    confirmations: requiredConfirmations(routingPolicy, routeDraft),
    typed: {"hostMembership.live": "host memberships live"},
    error: null,
    unconfirmed: null,
  },
};

export const CommercialTermsRouteStory: Story = {
  name: "Commercial terms",
  parameters: {
    catchComponent: {
      id: "route_commercial_terms",
      states: ["commercial-terms"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CommercialTermsWorkspace
        controller={platformController}
        onOpenOrganizer={noop}
        onOpenPlatform={noop}
      />
    </AdminWorkspace>
  ),
};

export const CommercialTermsWorkspaceStory: Story = {
  name: "Commercial terms: first save preview",
  parameters: {
    catchComponent: {
      id: "workspace_commercial_terms",
      states: ["unsaved-platform", "change-preview"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CommercialTermsWorkspace
        controller={unsavedPreviewController}
        onOpenOrganizer={noop}
        onOpenPlatform={noop}
      />
    </AdminWorkspace>
  ),
};

export const CommercialTermsOrganizerStory: Story = {
  name: "Commercial terms: organizer override",
  parameters: {
    catchComponent: {
      id: "workspace_commercial_terms",
      states: ["organizer-override"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CommercialTermsWorkspace
        controller={organizerController}
        onOpenOrganizer={noop}
        onOpenPlatform={noop}
      />
    </AdminWorkspace>
  ),
};

export const PaymentRoutingRouteStory: Story = {
  name: "Payment routing",
  parameters: {
    catchComponent: {
      id: "route_payment_routing",
      states: ["payment-routing"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <PaymentRoutingWorkspace controller={routingController} />
    </AdminWorkspace>
  ),
};

export const PaymentRoutingWorkspaceStory: Story = {
  name: "Payment routing: typed confirmation",
  parameters: {
    catchComponent: {
      id: "workspace_payment_routing",
      states: ["change-preview", "typed-confirmation"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <PaymentRoutingWorkspace controller={routingPreviewController} />
    </AdminWorkspace>
  ),
};
