import {
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchText,
  CatchTopBar,
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

interface Fact {
  label: string;
  value: string;
  tone?: ToneText["tone"];
}

export interface OrganizerPageLinks {
  /** The Events tab's list, read live by the route. */
  eventsTab: ReactNode;
  onBack: () => void;
  onTabChanged: (tab: OrganizerPageTab) => void;
  onOpenEvent: (source: "catch" | "imported", eventId: string) => void;
  onOpenSales: () => void;
  onOpenTerms: () => void;
  onOpenClaim: (requestId: string) => void;
  publicPageUrl: (canonicalPath: string) => string;
}

const toneColor = {success: "positiveText", warning: "attentionText", danger: "danger"} as const;

// Facts as label over value in one column; CatchMetaRow (#1389) replaces it with two.
function Facts({items}: {items: readonly Fact[]}) {
  return (
    <CatchGap size="formField">
      {items.map((item) => <Fact item={item} key={item.label} />)}
    </CatchGap>
  );
}

function Fact({item}: {item: Fact}) {
  return (
        <CatchGap size="headerTitleToSubtitle">
          <CatchText as="span" color="ink2" variant="supporting">{item.label}</CatchText>
          <CatchText
            as="span"
            color={item.tone === "success" || item.tone === "warning" || item.tone === "danger" ?
              toneColor[item.tone] : "ink"}
            variant="bodyM"
          >
            {item.value}
          </CatchText>
        </CatchGap>
  );
}

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">{title}</CatchText>
      {children}
    </CatchGap>
  );
}

// The journey as rows, oldest first, with what comes next; PR 3's CatchSection timeline replaces it.
function Journey({overview, limit}: {overview: OrganizerOverview; limit?: number}) {
  const steps = limit ? overview.journey.slice(-limit) : overview.journey;
  const next = nextStepCopy(overview.nextStep, overview.salesOwner?.name?.split(/\s+/u)[0] ?? null);
  return (
    <Section title="How it got here">
      {steps.map((step, index) => {
        const copy = journeyStepCopy(step, overview.organizer.name);
        return (
          <CatchIndexRow
            titleVariant="bodyM"
            key={`${step.kind}-${index}`}
            subtitle={copy.subtitle ?? undefined}
            title={copy.title}
            trailing={<CatchText as="span" color="ink2" variant="supporting">{stepTimeLabel(step.at)}</CatchText>}
          />
        );
      })}
      {next ? (
        <CatchIndexRow
            titleVariant="bodyM"
          subtitle={next.subtitle}
          title={next.title}
          trailing={<CatchText as="span" color="ink3" variant="supporting">Next</CatchText>}
        />
      ) : null}
    </Section>
  );
}

function SalesRow({overview, onOpenSales}: {overview: OrganizerOverview; onOpenSales: () => void}) {
  const owner = overview.salesOwner?.name;
  const task = overview.nextTask;
  return (
    <CatchIndexRow
            titleVariant="bodyM"
      onTap={onOpenSales}
      subtitle={task ? `${task.dueAt ? `${eventWhenLabel(task.dueAt).split(" · ")[0]}: ` : ""}${task.title}` :
        overview.nextAction ?? "No follow-up planned"}
      title={owner ? `${owner} owns it` : "No one in Sales owns it"}
      titleMaxLines={2}
      trailing={<CatchText as="span" color="primary" variant="supportingStrong">Open in Sales</CatchText>}
    />
  );
}

function overviewFacts(overview: OrganizerOverview, links: OrganizerPageLinks): Fact[] {
  const organizer = overview.organizer;
  const page = organizerPageLabel(organizer.pageState);
  const claim = organizerClaimLabel(organizer);
  const payments = paymentsLabel(overview.payments);
  return [
    {label: "City", value: [organizer.cityLabel, organizer.area === organizer.cityLabel ? null : organizer.area]
      .filter(Boolean).join(", ") || "—"},
    {label: "Kind", value: organizer.kindLabel ?? "—"},
    {label: "Public page", value: page.text, tone: page.tone},
    {label: "In the app", value: organizer.appVisibility === "hidden" ? "Hidden" : "Discoverable"},
    overview.pendingClaim ? {label: "Claim", value: `Waiting: ${overview.pendingClaim.requesterName ?? "a request"}`,
      tone: "warning"} :
      {label: "Claim", value: claim.text === "Unclaimed" ? "Not claimed yet" : claim.text, tone: claim.tone},
    {label: "Sales owner", value: overview.salesOwner?.name ?? "No one yet"},
    {label: "Terms", value: termsLabel(overview.terms)},
    {label: "Payments", value: payments.text, tone: payments.tone},
  ];
}

function upcoming(overview: OrganizerOverview, links: OrganizerPageLinks) {
  return (
    <Section title={`Upcoming · ${overview.upcomingEventCount}`}>
      {overview.upcomingEvents.length === 0 ? (
        <CatchText as="p" color="ink2" variant="bodyM">No upcoming events.</CatchText>
      ) : overview.upcomingEvents.map((event) => (
        <CatchIndexRow
            titleVariant="bodyM"
          key={event.key}
          onTap={() => links.onOpenEvent(event.source, event.eventId)}
          subtitle={eventWhenLabel(event.startTime)}
          title={event.title}
        />
      ))}
      <CatchGap direction="horizontal" size="related">
        <CatchButton label="All events" onPressed={() => links.onTabChanged("events")} size="sm" variant="quiet" />
      </CatchGap>
    </Section>
  );
}

function tabBody(tab: OrganizerPageTab, overview: OrganizerOverview, links: OrganizerPageLinks): {main: ReactNode; aside?: ReactNode} {
  switch (tab) {
  case "events":
    return {main: links.eventsTab};
  case "sales":
    return {main: (
      <CatchGap size="majorSection">
        <Facts items={[
          {label: "Sales owner", value: overview.salesOwner?.name ?? "No one yet"},
          {label: "Next step", value: overview.nextAction ?? "None written down"},
          {label: "Next task", value: overview.nextTask ? overview.nextTask.title : "None open"},
          {label: "Due", value: overview.nextTask?.dueAt ? eventWhenLabel(overview.nextTask.dueAt) : "—"},
        ]} />
        <SalesRow onOpenSales={links.onOpenSales} overview={overview} />
      </CatchGap>
    )};
  case "money": {
    const payments = paymentsLabel(overview.payments);
    return {main: (
      <CatchGap size="majorSection">
        <Facts items={[
          {label: "Terms", value: termsLabel(overview.terms)},
          {label: "Payments", value: payments.text, tone: payments.tone},
          {label: "Came from", value: cameFromLabel(overview.growth)},
          {label: "Credit to", value: creditToLabel(overview.growth)},
          {label: "First paid booking", value: overview.growth?.firstPaidBookingAt ?
            eventWhenLabel(overview.growth.firstPaidBookingAt).split(" · ")[0] : "Not yet"},
        ]} />
        <CatchGap direction="horizontal" size="related">
          <CatchButton label="Change terms" onPressed={links.onOpenTerms} size="sm" variant="secondary" />
        </CatchGap>
      </CatchGap>
    )};
  }
  case "history":
    return {main: <Journey overview={overview} />};
  default:
    return {
      main: (
        <CatchGap size="majorSection">
          <Facts items={overviewFacts(overview, links)} />
          {overview.organizer.hasImage ? null : (
            <Section title="No image we have the right to use">
              <CatchText as="p" color="attentionText" variant="bodyM">
                The page uses a lettermark until the organizer claims it and adds photos.
              </CatchText>
            </Section>
          )}
          <Journey limit={6} overview={overview} />
        </CatchGap>
      ),
      aside: (
        <CatchGap size="majorSection">
          {overview.pendingClaim ? (
            <Section title="Claim">
              <CatchIndexRow
                onTap={() => links.onOpenClaim(overview.pendingClaim!.requestId)}
                subtitle={overview.pendingClaim.requesterRole ?? undefined}
                title={`${overview.pendingClaim.requesterName ?? "Someone"} asked to claim it`}
                titleVariant="bodyM"
                trailing={<CatchText as="span" color="primary" variant="supportingStrong">Review</CatchText>}
              />
            </Section>
          ) : null}
          {upcoming(overview, links)}
          <Section title="Sales"><SalesRow onOpenSales={links.onOpenSales} overview={overview} /></Section>
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
