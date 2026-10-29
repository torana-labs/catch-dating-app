import {CatchBadge} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {ActivityMark, BadgeRow, ButtonLink, ContentGrid, OrganizerEventHighlights, OrganizerResultCardBody, OrganizerResultCardFooter, OrganizerResultCardShell, OrganizerResultCardTopline, type ActivityMeta} from "../shared/ui/primitives";

const dinnerActivity: ActivityMeta = {
  label: "Dinner",
  short: "DN",
  token: "var(--activity-dinner)",
};

const runActivity: ActivityMeta = {
  label: "Run club",
  short: "SR",
  token: "var(--activity-run)",
};

const meta = {
  title: "Marketing Website/Shared/Listing Primitives",
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

export const IdentityDisplayShellStory: Story = {
  name: "Identity display shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_identity_display_shell",
      routeIds: ["claim", "claim_lookup", "host", "organizer_search", "organizer_listing_canonical", "organizer_listing_legacy"],
      states: ["activity-mark", "status-badges"],
    },
  },
  render: () => (
    <ContentGrid variant="surface">
      <article>
        <ActivityMark
          activity={dinnerActivity}
          listing={{logo: {text: "ST"}, status: "verified"}}
          size="lg"
        />
        <h3>Sunday Table Club</h3>
        <BadgeRow>
          <CatchBadge recipe="solidStatus" label="Verified on Catch" />
          <CatchBadge recipe="functional" label="Owner claimed" />
        </BadgeRow>
      </article>
      <article>
        <ActivityMark
          activity={runActivity}
          listing={{logo: {text: "AF"}, status: "unclaimed"}}
          size="lg"
        />
        <h3>Afterfly</h3>
        <BadgeRow>
          <CatchBadge recipe="functional" label="Claimable" />
        </BadgeRow>
      </article>
    </ContentGrid>
  ),
};

export const OrganizerResultShellStory: Story = {
  name: "Organizer result shell",
  parameters: {
    a11y: {test: "todo"},
    catchComponent: {
      id: "shared_organizer_result_shell",
      routeIds: ["organizer_search"],
      states: ["result-card", "event-highlights", "footer-actions"],
    },
  },
  render: () => (
    <OrganizerResultCardShell activityToken="var(--activity-run)">
      <OrganizerResultCardBody>
        <OrganizerResultCardTopline>
          <ActivityMark
            activity={runActivity}
            listing={{logo: {text: "AF"}, status: "unclaimed"}}
          />
          <div>
            <h3>Afterfly</h3>
            <BadgeRow>
              <CatchBadge recipe="functional" label="Claimable" />
            </BadgeRow>
          </div>
        </OrganizerResultCardTopline>
        <p>Run club profile with public event evidence and open owner claim.</p>
        <OrganizerEventHighlights
          ariaLabel="Afterfly event highlights"
          items={[
            {
              activityToken: "var(--activity-run)",
              detail: "Mumbai",
              id: "afterfly-run",
              kind: "Run club",
              title: "Twilight run social",
            },
            {
              activityToken: "var(--activity-social)",
              detail: "Open RSVP",
              id: "afterfly-social",
              kind: "Social",
              title: "Post-run mixer",
            },
          ]}
        />
      </OrganizerResultCardBody>
      <OrganizerResultCardFooter>
        <ButtonLink href="/organizers/afterfly/" size="small">
          View listing
        </ButtonLink>
      </OrganizerResultCardFooter>
    </OrganizerResultCardShell>
  ),
};
