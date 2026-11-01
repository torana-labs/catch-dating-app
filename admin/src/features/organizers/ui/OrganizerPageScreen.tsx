import {
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchText,
  CatchTopBar,
  type CatchMetaEntry,
  type CatchSectionStep,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {eventWhenLabel, stepTimeLabel} from "../../../shared/domain/recordDates";
import type {OrganizerOverview} from "../api/organizerRecordsRepository";
import {
  cameFromLabel,
  creditToLabel,
  journeyStepCopy,
  nextStepCopy,
  organizerClaimLabel,
  organizerPageLabel,
  paymentsLabel,
  termsLabel,
  type ToneText,
} from "../controllers/organizerRecordLabels";

export type OrganizerPageTab = "overview" | "page" | "events" | "sales" | "money" | "history";

export interface OrganizerPageLinks {
  /** The Events tab's list, read live by the route. */
  eventsTab: ReactNode;
  /** The Money tab's bills, read live; null for those who cannot open Money. */
  moneyBills: ReactNode;
  /** Null for those who cannot open Payment setup. */
  onOpenTerms: (() => void) | null;
  onBack: () => void;
  onTabChanged: (tab: OrganizerPageTab) => void;
  onOpenEvent: (source: "catch" | "imported", eventId: string) => void;
  onOpenSales: () => void;
  onOpenClaim: (requestId: string) => void;
  publicPageUrl: (canonicalPath: string) => string;
}

function fact(label: string, value: string, tone?: ToneText["tone"]): CatchMetaEntry {
  return tone === "success" || tone === "warning" || tone === "danger" ?
    {label, value, tone} : {label, value};
}

function journeySteps(overview: OrganizerOverview, limit?: number): CatchSectionStep[] {
  const steps = limit ? overview.journey.slice(-limit) : overview.journey;
  const next = nextStepCopy(overview.nextStep, overview.salesOwner?.name?.split(/\s+/u)[0] ?? null);
  return [
    ...steps.map((step): CatchSectionStep => {
      const copy = journeyStepCopy(step, overview.organizer.name);
      return {title: copy.title, subtitle: copy.subtitle ?? undefined, meta: stepTimeLabel(step.at), state: "done"};
    }),
    ...(next ? [{title: next.title, subtitle: next.subtitle, meta: "Next", state: "next" as const}] : []),
  ];
}

function SalesRow({overview, onOpenSales}: {overview: OrganizerOverview; onOpenSales: () => void}) {
  const owner = overview.salesOwner?.name;
  const task = overview.nextTask;
  return (
    <CatchIndexRow
      onTap={onOpenSales}
      subtitle={task ? `${task.dueAt ? `${eventWhenLabel(task.dueAt).split(" · ")[0]}: ` : ""}${task.title}` :
        overview.nextAction ?? "No follow-up planned"}
      title={owner ? `${owner} owns it` : "No one in Sales owns it"}
      titleMaxLines={2}
      titleVariant="bodyM"
      trailing={<CatchText as="span" color="primary" variant="supportingStrong">Open in Sales</CatchText>}
    />
  );
}

function overviewFacts(overview: OrganizerOverview): CatchMetaEntry[] {
  const organizer = overview.organizer;
  const page = organizerPageLabel(organizer.pageState);
  const claim = organizerClaimLabel(organizer);
  const payments = paymentsLabel(overview.payments);
  return [
    fact("City", [organizer.cityLabel, organizer.area === organizer.cityLabel ? null : organizer.area]
      .filter(Boolean).join(", ") || "—"),
    fact("Kind", organizer.kindLabel ?? "—"),
    fact("Public page", page.text, page.tone),
    fact("In the app", organizer.appVisibility === "hidden" ? "Hidden" : "Discoverable"),
    overview.pendingClaim ?
      fact("Claim", `Waiting: ${overview.pendingClaim.requesterName ?? "a request"}`, "warning") :
      fact("Claim", claim.text === "Unclaimed" ? "Not claimed yet" : claim.text, claim.tone),
    fact("Sales owner", overview.salesOwner?.name ?? "No one yet"),
    fact("Terms", termsLabel(overview.terms)),
    fact("Payments", payments.text, payments.tone),
  ];
}

function upcoming(overview: OrganizerOverview, links: OrganizerPageLinks) {
  return (
    <CatchSection
      action={{label: "All events", onPressed: () => links.onTabChanged("events")}}
      count={overview.upcomingEventCount}
      empty="No upcoming events."
      title="Upcoming"
    >
      {overview.upcomingEvents.length === 0 ? null : overview.upcomingEvents.map((event) => (
        <CatchIndexRow
          key={event.key}
          onTap={() => links.onOpenEvent(event.source, event.eventId)}
          subtitle={eventWhenLabel(event.startTime)}
          title={event.title}
          titleVariant="bodyM"
        />
      ))}
    </CatchSection>
  );
}

function tabBody(tab: OrganizerPageTab, overview: OrganizerOverview, links: OrganizerPageLinks): {main: ReactNode; aside?: ReactNode} {
  switch (tab) {
  case "events":
    return {main: links.eventsTab};
  case "sales":
    return {main: (
      <CatchGap size="majorSection">
        <CatchMetaRow entries={[
          fact("Sales owner", overview.salesOwner?.name ?? "No one yet"),
          fact("Next step", overview.nextAction ?? "None written down"),
          fact("Next task", overview.nextTask ? overview.nextTask.title : "None open"),
          fact("Due", overview.nextTask?.dueAt ? eventWhenLabel(overview.nextTask.dueAt) : "—"),
        ]} />
        <SalesRow onOpenSales={links.onOpenSales} overview={overview} />
      </CatchGap>
    )};
  case "money": {
    const payments = paymentsLabel(overview.payments);
    return {main: (
      <CatchGap size="majorSection">
        <CatchMetaRow entries={[
          fact("Terms", termsLabel(overview.terms)),
          fact("Payments", payments.text, payments.tone),
          fact("Came from", cameFromLabel(overview.growth)),
          fact("Credit to", creditToLabel(overview.growth)),
          fact("First paid booking", overview.growth?.firstPaidBookingAt ?
            eventWhenLabel(overview.growth.firstPaidBookingAt).split(" · ")[0] : "Not yet"),
        ]} />
        {links.onOpenTerms ? (
          <CatchGap direction="horizontal" size="related">
            <CatchButton label="Change terms" onPressed={links.onOpenTerms} size="sm" variant="secondary" />
          </CatchGap>
        ) : null}
        {links.moneyBills}
      </CatchGap>
    )};
  }
  case "history":
    return {main: <CatchSection dividers="none" timeline={journeySteps(overview)} title="How it got here" />};
  default:
    return {
      main: (
        <CatchGap size="majorSection">
          <CatchMetaRow entries={overviewFacts(overview)} />
          {overview.organizer.hasImage ? null : (
            <CatchSection dividers="none" title="No image we have the right to use">
              <CatchText as="p" color="attentionText" variant="bodyM">
                The page uses a lettermark until the organizer claims it and adds photos.
              </CatchText>
            </CatchSection>
          )}
          <CatchSection dividers="none" timeline={journeySteps(overview, 6)} title="How it got here" />
        </CatchGap>
      ),
      aside: (
        <CatchGap size="majorSection">
          {overview.pendingClaim ? (
            <CatchSection dividers="none" title="Claim">
              <CatchIndexRow
                onTap={() => links.onOpenClaim(overview.pendingClaim!.requestId)}
                subtitle={overview.pendingClaim.requesterRole ?? undefined}
                title={`${overview.pendingClaim.requesterName ?? "Someone"} asked to claim it`}
                titleVariant="bodyM"
                trailing={<CatchText as="span" color="primary" variant="supportingStrong">Review</CatchText>}
              />
            </CatchSection>
          ) : null}
          {upcoming(overview, links)}
          <CatchSection dividers="none" title="Sales">
            <SalesRow onOpenSales={links.onOpenSales} overview={overview} />
          </CatchSection>
        </CatchGap>
      ),
    };
  }
}

/**
 * One organizer's page in the reading pattern. Overview shows its facts, its journey from
 * nomination to claim, its next events and who owns it in Sales; Page edits the public page;
 * Events, Sales, Money and History each take one part.
 */
export function OrganizerPageScreen({
  links,
  loadError,
  overview,
  pageEditor,
  tab,
}: {
  links: OrganizerPageLinks;
  loadError: string | null;
  overview: OrganizerOverview | null;
  /** The editor the Page tab shows. */
  pageEditor: ReactNode;
  tab: OrganizerPageTab;
}) {
  const canonicalPath = overview?.organizer.publishStatus === "published" ? overview.organizer.canonicalPath : null;
  const top = (
    <CatchTopBar
      actions={canonicalPath ? (
        <CatchButton href={links.publicPageUrl(canonicalPath)} label="Public page" newTab
          onPressed={() => undefined} size="sm" variant="secondary" />
      ) : undefined}
      back={{label: "Back to organizers", onPressed: links.onBack}}
      kicker="Organizers"
      title={overview?.organizer.name ?? "Organizer"}
      variant="tool"
    />
  );
  if (!overview) {
    return (
      <>
        {top}
        <CatchPaneLayout
          main={<CatchText as="p" color={loadError ? "danger" : "ink2"} variant="bodyM">
            {loadError ?? "Loading the organizer"}
          </CatchText>}
          pattern="reading"
        />
      </>
    );
  }
  const tabs = (
    <CatchPageTabBar
      label="Organizer"
      onChanged={(value) => links.onTabChanged(value as OrganizerPageTab)}
      options={[
        {value: "overview", label: "Overview"},
        {value: "page", label: "Page"},
        {value: "events", label: "Events", count: overview.upcomingEventCount},
        {value: "sales", label: "Sales"},
        {value: "money", label: "Money"},
        {value: "history", label: "History"},
      ]}
      selected={tab}
      size="sm"
    />
  );
  if (tab === "page") {
    return (
      <>
        {top}
        {tabs}
        {pageEditor}
      </>
    );
  }
  const body = tabBody(tab, overview, links);
  return (
    <>
      {top}
      <CatchPaneLayout
        aside={body.aside}
        main={<CatchGap size="section">{tabs}{body.main}</CatchGap>}
        pattern="reading"
      />
    </>
  );
}
