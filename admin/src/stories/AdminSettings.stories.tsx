import type {Meta, StoryObj} from "@storybook/react-vite";
import type {ReactNode} from "react";
import {
  draftFromTerms,
  platformTermsDiff,
} from "../features/settings/controllers/commercialTermsForm";
import type {
  CommercialTermsController,
} from "../features/settings/controllers/useCommercialTermsController";
import {
  draftFromPolicy,
  requiredConfirmations,
  routingDiff,
  type RoutingPolicy,
} from "../features/settings/controllers/paymentRoutingForm";
import type {
  PaymentRoutingController,
} from "../features/settings/controllers/usePaymentRoutingController";
import type {
  PaymentSettingsController,
} from "../features/settings/controllers/usePaymentSettingsController";
import {
  renderPaymentsOverview,
  renderRoutingEditor,
  renderTermsEditor,
} from "../features/settings/ui/paymentsSettingsPanels";
import {SettingsScreen} from "../features/settings/ui/SettingsScreen";
import type {CommercialTerms} from "../generated/contracts/commercialTerms";
import {ownerDecisionCommercialTerms} from "../shared/domain/commercialTermsDecision";

const meta = {
  title: "Admin Dashboard/Settings Payments",
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

const moneyController: PaymentSettingsController = {
  state: {revision: 1, settings: {gstRegistered: false, gstRateBasisPoints: 1800,
    billDueDayOfMonth: 15, nominatorCredit: {rateBasisPoints: 1000, months: 12,
      lapseDays: 90, minimumPayoutMinor: 50_000, payoutDayOfMonth: 10,
      earningRoles: ["partner", "guest", "organizer"]}},
  updatedAtMillis: savedAt, updatedByUid: "admin-owner", nextInvoiceNumber: "2026-27/032"},
  loadState: "ready",
  loadError: null,
  isSaving: false,
  saveError: null,
  save: async () => true,
};

function PaymentsPage({children}: {children: ReactNode}) {
  return (
    <SettingsScreen
      onSelectPage={noop}
      pages={[{id: "payments", title: "Payments", subtitle: "Terms, partner credit, GST"}]}
      selectedPage="payments"
    >
      {children}
    </SettingsScreen>
  );
}

const paymentsOverview = (terms: CommercialTermsController) => renderPaymentsOverview({
  terms, routing: routingController, money: moneyController, isExporting: false,
  lastMonthLabel: "October", onEdit: noop, onExport: noop,
});

export const SettingsPaymentsRouteStory: Story = {
  name: "Settings · Payments",
  render: () => <PaymentsPage>{paymentsOverview(platformController)}</PaymentsPage>,
};

export const SettingsTermsReviewStory: Story = {
  name: "Settings · Payments, terms to review",
  render: () => <PaymentsPage>{renderTermsEditor(unsavedPreviewController, noop)}</PaymentsPage>,
};

export const SettingsOrganizerTermsStory: Story = {
  name: "Settings · Payments, an organizer's own terms",
  render: () => <PaymentsPage>{renderTermsEditor({...organizerController, editor: {
    baseRevision: 1, draft: {rate: "3", trialDays: "60"}, reason: "", errors: [], preview: null, unconfirmed: null,
  }}, noop)}</PaymentsPage>,
};

export const SettingsRoutingReviewStory: Story = {
  name: "Settings · Payments, who collects to review",
  render: () => <PaymentsPage>{renderRoutingEditor(routingPreviewController, noop)}</PaymentsPage>,
};
