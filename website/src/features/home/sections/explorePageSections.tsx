import {
  CatchAppCaptureImage,
  CatchButton,
  CatchCardGrid,
  CatchChip,
  CatchPageTabBar,
  CatchSearchField,
  CatchStack,
  CatchText,
  type CatchBandAction,
  type CatchCardGridEmpty,
} from "@catch/web-ui";
import {discoveryPagesCopy} from "@content/discovery/discoveryPages";
import {explorePageCopy as copy} from "@content/explorePage";
import {homeFormats} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {captureSlot, type CaptureSlots} from "../../../shared/media/captureSlot";
import {CityAlertsCapture, cityAlertsAnchor} from "../../discovery/CityAlertsCapture";
import {DiscoveryDock} from "../../discovery/DiscoveryDock";
import {DiscoveryOrganisers} from "../../discovery/DiscoveryOrganisers";
import {organizerGridItems, planGridItems} from "../../discovery/discoveryCards";
import {CitySiteChrome} from "./cityChrome";
import type {ExploreFilters, ExploreView, ExploreWhen} from "../exploreModel";
import type {ExplorePageController} from "../useExplorePageController";

type Explore = ExplorePageController;
const whens: ExploreWhen[] = ["any", "today", "weekend", "week"];
const formats: ExploreFilters["format"][] = ["all", ...homeFormats.map((item) => item.format)];
const formatLabel = (value: ExploreFilters["format"]) =>
  value === "all" ? copy.formats.everything : homeFormats.find((item) => item.format === value)?.name ?? value;
/** The results band's anchor: the phone action bar and the empty window's hosts link scroll to it. */
const resultsAnchor = "explore-results";

/**
 * The page's headline, by what it leads with: what's on, the next two weeks, nothing yet, or launching soon.
 * It reads only these fields, so the release smoke's contract test can drive every state and view.
 */
export function exploreHeading(explore: {
  state: Explore["state"]; city: Pick<Explore["city"], "label">; filters: Pick<Explore["filters"], "view">;
  liveCity: Pick<NonNullable<Explore["liveCity"]>, "label"> | null;
}): {kicker: string; title: string; lead: string} {
  const city = explore.city.label;
  const plansView = explore.filters.view === "plans";
  if (explore.state === "soon") {
    return {kicker: copy.soonKicker, title: fill(copy.soonTitle, {city}),
      lead: explore.liveCity ? fill(copy.soonLead, {liveCity: explore.liveCity.label}) : copy.soonLeadAlone};
  }
  if (plansView && explore.state === "quiet") return {kicker: copy.quiet.kicker, title: fill(copy.quiet.title, {city}), lead: copy.quiet.lead};
  if (plansView && explore.state === "empty") return {kicker: fill(copy.eyebrow, {city}), title: fill(copy.liveNoPlans, {city}), lead: copy.liveNoPlansBody};
  return {kicker: fill(copy.eyebrow, {city}), title: fill(copy.title, {city}), lead: copy.lead};
}

/** The headline's actions: the live city and the host way in for a city not open; the hosts and the capture for an empty window. */
function exploreActions(explore: Explore): CatchBandAction[] | undefined {
  if (explore.state === "soon") {
    return [
      ...(explore.liveCity ? [{label: fill(copy.liveCityAction, {city: explore.liveCity.label}), href: explore.cityHref(explore.liveCity.slug)}] : []),
      {label: fill(copy.soonHostAction, {city: explore.city.label}), href: "/host/#start", variant: "secondary"},
    ];
  }
  if (explore.state === "empty" && explore.filters.view === "plans") {
    return [{label: copy.seeHosts, href: explore.organisersHref}, {label: copy.getNotified, href: `#${cityAlertsAnchor}`, variant: "secondary"}];
  }
  return undefined;
}

/** One row of choice chips (the board's filter pills), as the homepage's plan filters draw them. */
function ChipRow<T extends string>({label, values, selected, name, dot, onChanged}: {
  label: string; values: readonly T[]; selected: T; name: (value: T) => string;
  dot?: (value: T) => ExploreFilters["format"] | undefined; onChanged: (value: T) => void;
}) {
  return (
    <CatchStack aria-label={label} direction="row" gap={8} role="radiogroup" wrap>
      {values.map((value) => {
        const accent = dot?.(value);
        return (
          <CatchChip colourWhenSelected dot={accent === undefined || accent === "all" || accent === "other" ? undefined : accent} key={value} kind="choice"
            label={name(value)} onPressed={() => onChanged(value)} selected={selected === value} />
        );
      })}
    </CatchStack>
  );
}

/** The Plans and Organisers tabs, the format pills and, for plans, the date pills; then search and the honest count. */
function ExploreFilterBar({explore}: {explore: Explore}) {
  const {filters} = explore;
  const leading = explore.state === "full" || explore.state === "filtered";
  return (
    <CatchStack gap={12}>
      <CatchPageTabBar
        label={copy.view.label}
        onChanged={(view) => explore.update({view: view as ExploreView})}
        options={explore.tabs}
        selected={filters.view}
      />
      <ChipRow dot={(value) => value} label={copy.formats.label} name={formatLabel} onChanged={(format) => explore.update({format})}
        selected={filters.format} values={formats} />
      {filters.view === "plans" ? (
        <ChipRow label={copy.when.label} name={(when) => copy.when[when]} onChanged={(when) => explore.update({when})} selected={filters.when} values={whens} />
      ) : null}
      <CatchSearchField
        copy={{searchLabel: copy.search.label, clearTooltip: (query) => fill(copy.search.clear, {query}), closeSearchLabel: copy.search.close}}
        onSubmitted={(query) => explore.update({query: query.trim()})}
        placeholder={copy.search.placeholder}
        semanticLabel={copy.search.label}
        value={filters.query}
      />
      {/* The count only where it is news: never “0 plans” for a city that is waiting. */}
      {leading ? <CatchText aria-live="polite" as="p" tone="secondary" variant="body-small">{explore.summary}</CatchText> : null}
    </CatchStack>
  );
}

/**
 * What an empty grid says: a filter miss offers Clear filters; a city that
 * is waiting (not open yet, or nothing listed) says so, never "0 plans";
 * an open city's empty window has its headline instead.
 */
function exploreEmpty(explore: Explore): CatchCardGridEmpty | undefined {
  const city = explore.city.label;
  if (explore.unavailable) return {title: copy.unavailable, message: copy.unavailableBody};
  const clear = <CatchButton label={copy.clear} onPressed={explore.clear} variant="secondary" />;
  if (explore.filters.view === "organisers") {
    return explore.filtered ? {title: copy.noOrganisers, message: fill(copy.noOrganisersBody, {city}), actions: clear} :
      {title: fill(copy.soonNoOrganisers, {city}), message: copy.soonNoOrganisersBody};
  }
  if (explore.filtered) return {title: copy.noPlans, message: copy.noPlansBody, actions: clear};
  if (explore.state === "soon") return {title: fill(copy.soonNoPlans, {city}), message: copy.soonNoPlansBody};
  return undefined;
}

/** The headline band: the plans or the organisers, as the board's card grid with the filters between. */
function ExploreResults({explore}: {explore: Explore}) {
  const heading = exploreHeading(explore);
  // The board's kicker colours: coral over an empty window, pink otherwise.
  const kickerAccent = explore.state === "empty" || explore.state === "soon" ? "coral" as const : undefined;
  const shared = {
    actions: exploreActions(explore),
    empty: exploreEmpty(explore),
    filters: <ExploreFilterBar explore={explore} />,
    id: resultsAnchor,
    kicker: heading.kicker,
    kickerAccent,
    lead: heading.lead,
    level: 1 as const,
    title: heading.title,
  };
  if (explore.unavailable) return <CatchCardGrid {...shared} items={[]} kind="plan" />;
  return explore.filters.view === "organisers" ?
    <CatchCardGrid {...shared} columns={4} items={organizerGridItems(explore.organizers)} kind="org" /> :
    <CatchCardGrid {...shared} columns={3} items={planGridItems(explore.plans)} kind="plan" />;
}

/** Under the plans of an open city: who runs them as the kit's Follow cards on the tint panel, and the way to all of them in the Organisers tab. */
function ExploreHosts({explore}: {explore: Explore}) {
  if (explore.filters.view !== "plans" || !explore.hosts.length) return null;
  const band = explore.state === "full" ? copy.hosts.full : explore.state === "quiet" ? copy.hosts.quiet :
    explore.state === "empty" ? {kicker: fill(copy.hosts.empty.kicker, {city: explore.city.label}), title: copy.hosts.empty.title} : null;
  if (!band) return null;
  return (
    <DiscoveryOrganisers action={explore.moreHosts ? {label: copy.hosts.seeAll, href: explore.organisersHref} : undefined} cards={explore.hosts}
      kicker={band.kicker} title={band.title} />
  );
}

/**
 * Explore and the city pages (the PlaybookExplore board): a city's plans and
 * organisers from its cityPlans read model, with Plans and Organisers as
 * tabs, filtered by format, date and search; the hosts under the plans on
 * the tint panel; and, when the week is quiet, the window is empty or the
 * city is not open yet, the WhatsApp band for new plans beside the app.
 * Then the footer and the phone action bar. It arranges library parts and
 * binds the controller's view of the city to them (D18).
 */
export function ExplorePageSections({captures = {}, explore}: {captures?: CaptureSlots; explore: Explore}) {
  const capture = explore.state === "quiet" || explore.state === "empty" || explore.state === "soon";
  const screen = captureSlot(captures, "guest-explore");
  return (
    <CitySiteChrome cities={explore.cities} city={explore.city} discovery={explore.discovery}
      dock={<DiscoveryDock href={`#${resultsAnchor}`} label={discoveryPagesCopy.dock.explore} message={explore.notifyMessage} />}
      exploreHref={explore.exploreHref} onChooseCity={explore.chooseCity} showWhatsOn={explore.showWhatsOn}>
      <ExploreResults explore={explore} />
      <ExploreHosts explore={explore} />
      {capture ? (
        <CityAlertsCapture interests={explore.notify.interests} place={explore.notify.place}
          media={screen ? <CatchAppCaptureImage {...screen} caption={undefined} size="md" /> : undefined} />
      ) : null}
    </CitySiteChrome>
  );
}
