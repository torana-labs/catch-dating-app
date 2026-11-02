import type {AdminOrganizerDetails, AdminOrganizerListRow} from "../shared/types/adminTypes";
import {sampleOrganizerDetails} from "../shared/api/sampleData";
import {completePublishChecklist, diffOrganizerProfile, emptyPublishChecklist, formFromOrganizerProfile, validateOrganizerPublishingForm} from "../features/organizers/controllers/organizerPublishingHelpers";
import {filterOrganizerRows, type OrganizerPublishingController} from "../features/organizers/controllers/useOrganizerPublishingController";
import {AdminWorkspace} from "../shared/ui/AdminPrimitives";
import {OrganizerPublishingWorkspace} from "../features/organizers/ui/OrganizerPublishingScreen";
import {useState} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {noop} from "./adminRouteStoryKit";

const meta = {
  title: "Admin Dashboard/Routes",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const organizerPublishingRows: AdminOrganizerListRow[] =
  Object.values(sampleOrganizerDetails).map(organizerListRowFromDetails);

const organizerPublishingOrganizer = sampleOrganizerDetails.afterfly ?? null;

const organizerPublishingForm = organizerPublishingOrganizer ?
  formFromOrganizerProfile(organizerPublishingOrganizer) :
  null;

const organizerPublishingDiffRows = diffOrganizerProfile(
  organizerPublishingOrganizer,
  organizerPublishingForm
);

const organizerPublishingController: OrganizerPublishingController = {
  backToList: () => {
    noop();
  },
  checklist: emptyPublishChecklist,
  organizer: organizerPublishingOrganizer,
  organizerId: organizerPublishingOrganizer?.organizerId ?? "",
  completeChecklist: false,
  diffRows: organizerPublishingDiffRows,
  filter: "launchCities",
  filteredRows: filterOrganizerRows(organizerPublishingRows, "launchCities"),
  form: organizerPublishingForm,
  isDetailLoading: false,
  isListLoading: false,
  isPublishing: false,
  isSaving: false,
  listGeneratedAt: "2026-07-03T10:08:00.000Z",
  publishingIssues: validateOrganizerPublishingForm(
    organizerPublishingForm,
    {publishing: true, requireReviewNote: true}
  ),
  query: "",
  refreshList: async () => {
    noop();
  },
  rows: organizerPublishingRows,
  save: async () => {
    noop();
    return true;
  },
  saveAndPublish: async () => {
    noop();
  },
  selectOrganizer: (_organizerId) => {
    noop();
  },
  setChecklist: (_value) => {
    noop();
  },
  setOrganizerId: (_value) => {
    noop();
  },
  setFilter: (_value) => {
    noop();
  },
  setForm: (_value) => {
    noop();
  },
  setQuery: (_value) => {
    noop();
  },
  validationIssues: validateOrganizerPublishingForm(
    organizerPublishingForm,
    {requireReviewNote: organizerPublishingDiffRows.length > 0}
  ),
  view: "list",
};

function organizerListRowFromDetails(organizer: AdminOrganizerDetails): AdminOrganizerListRow {
  return {
    appVisibility: organizer.appVisibility,
    canonicalPath: organizer.publicPage.canonicalPath,
    cityName: organizer.cityName ?? organizer.area,
    citySlug: organizer.location ?? organizer.publicPage.citySlug,
    claimState: organizer.claimState,
    organizerId: organizer.organizerId,
    countryCode: organizer.countryCode,
    organizerType: organizer.organizerType,
    publicCategoryLabel: organizer.publicCategoryLabel,
    displayCategory: organizer.displayCategory,
    indexStatus: organizer.publicPage.indexStatus,
    name: organizer.name,
    ownershipState: organizer.ownershipState,
    publishStatus: organizer.publicPage.publishStatus,
    regionName: organizer.regionName,
    robots: organizer.publicPage.robots,
    routeReservationStatus: organizer.publicPage.canonicalPath ? "reserved" : "missing",
    routeStatus: organizer.publicPage.canonicalPath ? "valid" : "missing",
    searchIndexStatus: organizer.publicPage.indexStatus === "indexed" ?
      "indexed" :
      "missing",
    sourceConfidence: organizer.provenance.sourceConfidence,
    verificationStatus: organizer.provenance.verificationStatus,
  };
}

const renderOrganizerPublishingWorkspace = () => (
  <AdminWorkspace>
    <OrganizerPublishingWorkspace controller={{...organizerPublishingController, view: "detail"}} />
  </AdminWorkspace>
);

function OrganizerPublishingBlockedDraftPreview() {
  const [form, setForm] = useState(organizerPublishingForm);
  const [checklist, setChecklist] = useState(emptyPublishChecklist);
  const diffRows = diffOrganizerProfile(organizerPublishingOrganizer, form);
  const controller: OrganizerPublishingController = {
    ...organizerPublishingController,
    checklist,
    completeChecklist: completePublishChecklist(checklist),
    diffRows,
    form,
    publishingIssues: validateOrganizerPublishingForm(
      form,
      {publishing: true, requireReviewNote: true}
    ),
    setChecklist,
    setForm,
    validationIssues: validateOrganizerPublishingForm(
      form,
      {requireReviewNote: diffRows.length > 0}
    ),
    view: "detail",
  };
  return (
    <AdminWorkspace>
      <OrganizerPublishingWorkspace controller={controller} />
    </AdminWorkspace>
  );
}

export const OrganizerPublishingRouteStory: Story = {
  name: "Organizers",
  parameters: {
    catchComponent: {
      id: "route_organizer_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderOrganizerPublishingWorkspace,
};

export const OrganizerPublishingWorkspaceStory: Story = {
  name: "Organizers workspace",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_publishing",
      states: ["canonical-detail"],
    },
  },
  render: renderOrganizerPublishingWorkspace,
};

export const OrganizerPublishingBlockedDraftStory: Story = {
  name: "Organizer blocked draft",
  parameters: {
    catchComponent: {
      id: "workspace_organizer_publishing",
      states: ["blocked-draft"],
    },
  },
  render: () => <OrganizerPublishingBlockedDraftPreview />,
};
