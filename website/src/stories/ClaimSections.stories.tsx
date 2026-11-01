import type {Meta, StoryObj} from "@storybook/react-vite";
import {brand} from "@catch/brand";
import {
  ClaimHeroSection,
  ClaimSearchSection,
  ClaimUrlStateSection,
} from "../features/claims/sections/ClaimPageSections";
import type {ClaimFlowController} from "../features/claims/useClaimFlowController";
import {InstantClaimPanel} from "../features/claims/sections/InstantClaimSection";
import type {InstantClaimController} from "../features/claims/useInstantClaimController";
import {hostListings} from "./fixtures/hostListings";
import {isUnclaimedListing, isVerifiedListing} from "../features/organizers/selectors";
import type {HostListing} from "../features/organizers/types";

const claimableListing = hostListings.find(isUnclaimedListing) ?? requireListing("afterfly");
const claimedListing = hostListings.find(isVerifiedListing) ?? requireListing("club-sales-sunday-table");

const meta = {
  title: "Marketing Website/Claims/Sections",
  parameters: {
    catchComponentRegistry: {
      path: "design/website/components.json",
    },
    catchRouteContract: {
      path: "design/website/routes.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ClaimHero: Story = {
  name: "Hero",
  parameters: {
    catchComponent: {
      id: "claim_hero_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["no-listing", "selected-listing"],
    },
  },
  render: () => <ClaimHeroSection listing={claimableListing} />,
};

export const ClaimUrlState: Story = {
  name: "URL state · already claimed",
  parameters: {
    catchComponent: {
      id: "claim_url_state_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["already-claimed"],
    },
  },
  render: () => (
    <ClaimUrlStateSection
      state="alreadyClaimed"
      listing={claimedListing}
      lookup={claimedListing.slug}
      requestId={null}
    />
  ),
};

export const ClaimUrlStatePending: Story = {
  name: "URL state · pending claim",
  parameters: {
    catchComponent: {
      id: "claim_url_state_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["pending-claim"],
    },
  },
  render: () => (
    <ClaimUrlStateSection
      state="pendingClaim"
      listing={claimableListing}
      lookup={claimableListing.slug}
      requestId="claim_req_123"
    />
  ),
};

export const ClaimUrlStateNotFound: Story = {
  name: "URL state · not found",
  parameters: {
    catchComponent: {
      id: "claim_url_state_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["not-found"],
    },
  },
  render: () => (
    <ClaimUrlStateSection
      state="notFound"
      listing={null}
      lookup="missing-organizer"
      requestId={null}
    />
  ),
};

export const ClaimSearch: Story = {
  name: "Search · listing search",
  parameters: {
    catchComponent: {
      id: "claim_search_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["listing-search"],
    },
  },
  render: () => <ClaimSearchSection controller={mockClaimController({listing: null, query: "dinner"})} />,
};

export const ClaimSearchSelected: Story = {
  name: "Search · selected listing",
  parameters: {
    catchComponent: {
      id: "claim_search_section",
      routeIds: ["claim", "claim_lookup"],
      states: ["selected-listing"],
    },
  },
  render: () => <ClaimSearchSection controller={mockClaimController()} />,
};

const inHalfAnHour = "2026-10-31T12:30:00.000Z";
const instagramAttempt = {attemptId: "attempt-1", organizerId: claimableListing.id, method: "instagramMessage" as const,
  code: "482173", proofText: "482173", proofTarget: "carterroadrunners", catchInstagramHandle: brand.social.instagramHandle,
  expiresAt: inHalfAnHour};
const lumaAttempt = {...instagramAttempt, method: "lumaDescription" as const, proofText: "catch-482173",
  proofTarget: "https://lu.ma/carterroadrunners", catchInstagramHandle: null};

export const InstantClaimChoose: Story = {
  name: "Instant check · choose",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["choose"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({})} listing={claimableListing} />,
};

export const InstantClaimInstagram: Story = {
  name: "Instant check · Instagram code",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["instagram-code"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "code", attempt: instagramAttempt})} listing={claimableListing} />,
};

export const InstantClaimWrongSender: Story = {
  name: "Instant check · wrong sender",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["instagram-wrong-sender"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "code", attempt: instagramAttempt, rejection: "wrongSender"})} listing={claimableListing} />,
};

export const InstantClaimLuma: Story = {
  name: "Instant check · Luma code",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["luma-code"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "code", attempt: lumaAttempt})} listing={claimableListing} />,
};

export const InstantClaimExpired: Story = {
  name: "Instant check · expired",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["expired"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "code", attempt: instagramAttempt, expired: true})} listing={claimableListing} />,
};

export const InstantClaimDone: Story = {
  name: "Instant check · verified",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["verified"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "done"})} listing={claimableListing} />,
};

export const InstantClaimReview: Story = {
  name: "Instant check · review request",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["review"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "review",
    proofLinks: "https://carterroadrunners.in"})} listing={claimableListing} />,
};

export const InstantClaimNoMethods: Story = {
  name: "Instant check · no code check, review only",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["review-only"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "review", methods: [], chosen: undefined})}
    listing={claimableListing} />,
};

export const InstantClaimRequested: Story = {
  name: "Instant check · review requested",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["requested"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({phase: "requested"})} listing={claimableListing} />,
};

export const InstantClaimPendingReview: Story = {
  name: "Instant check · after a review request",
  parameters: {
    catchComponent: {
      id: "claim_instant_check_panel",
      routeIds: ["claim", "claim_lookup"],
      states: ["pending-review"],
    },
  },
  render: () => <InstantClaimPanel controller={mockInstantController({})} listing={claimableListing} pendingReview />,
};

function mockInstantController(overrides: Partial<InstantClaimController>): InstantClaimController {
  const methods = [
    {method: "instagramMessage" as const, available: true, proofTarget: "carterroadrunners", unavailableReason: null},
    {method: "lumaDescription" as const, available: true, proofTarget: "https://lu.ma/carterroadrunners",
      unavailableReason: null},
  ];
  const noop = () => undefined;
  return {
    account: {} as InstantClaimController["account"],
    phase: "choose", methods, chosen: methods[0], attempt: null, expired: false, copied: false, error: "",
    rejection: null, lumaMissing: false, starting: false, checking: false, catchInstagramHandle: brand.social.instagramHandle,
    proofLinks: "", setProofLinks: noop, note: "", setNote: noop, requesting: false,
    setMethod: noop, showCode: async () => undefined, checkLuma: async () => undefined, copyCode: noop, chooseAgain: noop,
    openReview: noop, requestReview: async () => undefined,
    ...overrides,
  };
}

function mockClaimController(overrides: Partial<ClaimFlowController> = {}): ClaimFlowController {
  const listing = claimableListing;
  return {
    activeRequestId: null,
    claimLookup: null,
    claimUrlState: null,
    clearListing: () => undefined,
    listing,
    listingFromLink: false,
    markClaimStarted: () => undefined,
    query: listing.name,
    searchResults: [listing],
    selectListing: (_listing: HostListing) => undefined,
    setQuery: (_query: string) => undefined,
    ...overrides,
  };
}

function requireListing(id: string): HostListing {
  const listing = hostListings.find((item) => item.id === id);
  if (!listing) {
    throw new Error(`Missing generated organizer listing fixture: ${id}`);
  }
  return listing;
}
