import {
  CatchButton,
  CatchGap,
  CatchPaneLayout,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import {shortDateLabel} from "../../../shared/domain/recordDates";
import type {OrganizerDirectoryRow} from "../api/organizerRecordsRepository";
import {
  organizerClaimLabel,
  organizerPageLabel,
  organizerSubtitle,
  salesOwnerShortName,
  upcomingLabel,
  type ToneText,
} from "../controllers/organizerRecordLabels";
import type {
  OrganizerDirectoryController,
  OrganizerDirectoryView,
} from "../controllers/useOrganizerDirectoryController";

interface OrganizerTableRow {
  key: string;
  organizer: {title: string; subtitle?: string};
  page: {text: string; tone?: "success" | "warning" | "danger"};
  claim: {text: string; tone?: "success" | "warning" | "danger"};
  owner: string;
  events: string;
  listed: string;
}

const columns: readonly CatchTableColumn<OrganizerTableRow>[] = [
  {key: "organizer", label: "Organizer", kind: "title"},
  {key: "page", label: "Page", width: "230px"},
  {key: "claim", label: "Claim", width: "170px"},
  {key: "owner", label: "Sales owner", width: "120px"},
  {key: "events", label: "Events", width: "120px"},
  {key: "listed", label: "Listed", width: "100px", sort: "desc", align: "end"},
];

const viewLabels: Record<OrganizerDirectoryView, string> = {
  all: "All", live: "Live", unclaimed: "Unclaimed", hidden: "Hidden",
};

/** How many kinds get a chip; the rest are reached by search. */
const kindChips = 4;

function cell(value: ToneText): OrganizerTableRow["page"] {
  const tone = value.tone === "success" || value.tone === "warning" ||
    value.tone === "danger" ? value.tone : undefined;
  return tone ? {text: value.text, tone} : {text: value.text};
}

function tableRow(row: OrganizerDirectoryRow): OrganizerTableRow {
  const subtitle = organizerSubtitle(row);
  return {
    key: row.organizerId,
    organizer: subtitle ? {title: row.name, subtitle} : {title: row.name},
    page: cell(organizerPageLabel(row.pageState)),
    claim: cell(organizerClaimLabel(row)),
    owner: salesOwnerShortName(row.salesOwner),
    events: upcomingLabel(row.upcomingEventCount),
    listed: shortDateLabel(row.listedAt),
  };
}

function chipsOf(controller: OrganizerDirectoryController) {
  const {facets, filters} = controller;
  if (!facets) return [];
  const claimWaiting = facets.claimStates.find((state) => state.value === "claimPending")?.count ?? 0;
  return [
    ...facets.cities.map((city) => ({label: city.label, selected: filters.citySlug === city.value,
      onPressed: () => controller.toggleCity(city.value)})),
    ...facets.kinds.slice(0, kindChips).map((kind) => ({label: kind.label, selected: filters.kind === kind.value,
      onPressed: () => controller.toggleKind(kind.value)})),
    {label: "Claim waiting", count: claimWaiting, selected: filters.claimState === "claimPending",
      onPressed: () => controller.toggleClaimState("claimPending")},
    {label: "Mine", count: facets.mine, selected: filters.mine, onPressed: controller.toggleMine},
  ];
}

/**
 * Organizers: every listed organizer in one wide table with real totals, newest listed first.
 * The view picks all, live, unclaimed or hidden; chips narrow by city, kind, a waiting claim and
 * the organizers whose Sales account is yours.
 */
export function OrganizerDirectoryScreen({
  controller,
  onAddOrganizer,
  onOpenOrganizer,
}: {
  controller: OrganizerDirectoryController;
  onAddOrganizer: () => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  const {filters, views} = controller;
  let main;
  if (controller.loadState === "loading") {
    main = <CatchText as="p" color="ink2" variant="bodyM">Loading organizers</CatchText>;
  } else if (controller.loadState === "error") {
    main = <CatchText as="p" color="danger" variant="bodyM">{controller.loadError ?? "Organizers could not load."}</CatchText>;
  } else if (controller.rows.length === 0) {
    main = <CatchText as="p" color="ink2" variant="bodyM">No organizers match.</CatchText>;
  } else {
    main = (
      <CatchGap size="related">
        <CatchTable
          columns={columns}
          density="compact"
          label="Organizers"
          onRowPressed={(row) => onOpenOrganizer(row.key)}
          rowKey="key"
          rows={controller.rows.map(tableRow)}
        />
        {controller.hasMore ? (
          <CatchButton
            label={controller.isLoadingMore ? "Loading more" : "Show more"}
            onPressed={controller.isLoadingMore ? null : controller.loadMore}
            size="sm"
            variant="secondary"
          />
        ) : null}
      </CatchGap>
    );
  }
  return (
    <>
      <CatchWorkspaceHeader
        actions={<CatchButton label="Add an organizer" onPressed={onAddOrganizer} size="sm" />}
        count={controller.total ?? undefined}
        filters={{
          chips: chipsOf(controller),
          search: {placeholder: "Search organizers", value: filters.query, onChanged: controller.setQuery},
        }}
        note={controller.complete ? undefined : "Counts cover the organizers read so far"}
        title="Organizers"
        views={{
          items: (Object.keys(viewLabels) as OrganizerDirectoryView[]).map((value) => ({
            value, label: viewLabels[value], count: views?.[value],
          })),
          value: filters.view,
          label: "Show",
          onChanged: (value) => controller.setView(value as OrganizerDirectoryView),
        }}
      />
      <CatchPaneLayout main={main} pattern="wide-table" />
    </>
  );
}
