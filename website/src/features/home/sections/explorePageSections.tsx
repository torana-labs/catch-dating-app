import {
  CatchBand,
  CatchButton,
  CatchChoiceInput,
  CatchEmptyState,
  CatchGap,
  CatchGrid,
  CatchOrganizerCard,
  CatchPlanCard,
  CatchSearchField,
  CatchSplit,
  CatchText,
} from "@catch/web-ui";
import {explorePageCopy as copy} from "@content/explorePage";
import {homeFormats, homePageCopy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {CitySiteChrome} from "./cityChrome";
import type {ExploreFilters, ExploreView, ExploreWhen} from "../exploreModel";
import type {ExplorePageController} from "../useExplorePageController";

type Explore = ExplorePageController;
// A link button's press only navigates.
const follow = () => undefined;
const views: ExploreView[] = ["plans", "organisers"];
const whens: ExploreWhen[] = ["any", "today", "weekend", "week"];
const formats: ExploreFilters["format"][] = ["all", ...homeFormats.map((item) => item.format)];
const formatLabel = (value: ExploreFilters["format"]) =>
  value === "all" ? copy.formats.everything : homeFormats.find((item) => item.format === value)?.name ?? value;

function ExploreHeading({explore}: {explore: Explore}) {
  const city = explore.city.label;
  const soon = !explore.live && !explore.unavailable;
  return (
    <CatchSplit
      align="end"
      end={soon && explore.liveCity ? (
        <CatchButton href={explore.cityHref(explore.liveCity.slug)} label={fill(copy.liveCityAction, {city: explore.liveCity.label})}
          onPressed={follow} variant="secondary" />
      ) : null}
      ratio="sevenFive"
      start={
        <CatchGap size="related">
          <CatchText as="p" color="coral" variant="supportingStrong">{fill(copy.eyebrow, {city})}</CatchText>
          <CatchText as="h1" id="explore-title" variant="displayXl">{fill(soon ? copy.soonTitle : copy.title, {city})}</CatchText>
          <CatchText as="p" color="ink2" variant="bodyLead">
            {soon ? fill(copy.soonLead, {liveCity: explore.liveCity?.label ?? city}) : copy.lead}
          </CatchText>
        </CatchGap>
      }
    />
  );
}

function ExploreFilterBar({explore}: {explore: Explore}) {
  const {filters} = explore;
  return (
    <CatchGap size="related">
      <CatchSearchField
        copy={{searchLabel: copy.search.label, clearTooltip: (query) => fill(copy.search.clear, {query}), closeSearchLabel: copy.search.close}}
        onSubmitted={(query) => explore.update({query: query.trim()})}
        placeholder={copy.search.placeholder}
        semanticLabel={copy.search.label}
        value={filters.query}
      />
      <CatchChoiceInput
        options={views.map((view) => ({value: view, label: copy.view[view]}))}
        onChanged={(view) => explore.update({view})}
        recipe="segmented"
        selected={filters.view}
      />
      <CatchChoiceInput
        itemLabelBuilder={formatLabel}
        mode="single"
        onChanged={(chosen) => explore.update({format: [...chosen][0] ?? "all"})}
        selected={new Set([filters.format])}
        values={formats}
      />
      {filters.view === "plans" ? (
        <CatchChoiceInput
          itemLabelBuilder={(when: ExploreWhen) => copy.when[when]}
          mode="single"
          onChanged={(chosen) => explore.update({when: [...chosen][0] ?? "any"})}
          selected={new Set([filters.when])}
          values={whens}
        />
      ) : null}
    </CatchGap>
  );
}

function ExploreResults({explore}: {explore: Explore}) {
  const empty = (title: string, message: string) => (
    <CatchEmptyState actions={explore.filtered ? <CatchButton label={copy.clear} onPressed={explore.clear} variant="secondary" /> : undefined}
      announce="polite" message={message} title={title} />
  );
  if (explore.unavailable) return empty(copy.unavailable, copy.unavailableBody);
  if (explore.filters.view === "organisers") {
    return explore.organizers.length ? (
      <CatchGrid columns={3} compactColumns={1}>
        {explore.organizers.map((organizer) => (
          <CatchOrganizerCard
            action={organizer.action.kind === "page" ? (
              <CatchButton href={organizer.action.href} label={homePageCopy.organisers.seePage} onPressed={follow}
                semanticsLabel={fill(homePageCopy.organisers.seePageLabel, {name: organizer.name})} size="sm" variant="secondary" />
            ) : organizer.action.kind === "claim" ? (
              <CatchButton href={organizer.action.href} label={homePageCopy.organisers.claim} onPressed={follow} size="sm" variant="quiet" />
            ) : undefined}
            footnote={organizer.footnote}
            href={organizer.href}
            initials={organizer.initials}
            key={organizer.key}
            monogramGround={organizer.monogramGround}
            name={organizer.name}
            next={organizer.next}
            subtitle={organizer.subtitle}
          />
        ))}
      </CatchGrid>
    ) : empty(copy.noOrganisers, fill(copy.noOrganisersBody, {city: explore.city.label}));
  }
  return explore.plans.length ? (
    <CatchGrid columns={4} compactColumns={1}>
      {explore.plans.map((plan) => (
        <CatchPlanCard availability={plan.availability} detail={plan.detail} format={plan.format} href={plan.href} key={plan.key}
          label={plan.label} photoUrl={plan.photoUrl} posterLabel={plan.posterLabel} price={plan.price} title={plan.title} />
      ))}
    </CatchGrid>
  ) : empty(copy.noPlans, copy.noPlansBody);
}

/**
 * Explore and the city pages (CAT-261): a city's plans and organisers from
 * its cityPlans read model, filtered by search, format and date. It arranges
 * library parts and binds the controller's view of the city to them (D18).
 */
export function ExplorePageSections({explore}: {explore: Explore}) {
  return (
    <CitySiteChrome cities={explore.cities} city={explore.city} exploreHref={explore.exploreHref} onChooseCity={explore.chooseCity}>
      <CatchBand aria-labelledby="explore-title" pb="spacious" pt="compact">
        <CatchGap size="majorSection">
          <ExploreHeading explore={explore} />
          <ExploreFilterBar explore={explore} />
          <CatchGap size="section">
            <CatchText aria-live="polite" as="p" color="ink2" variant="bodyM">{explore.summary}</CatchText>
            <ExploreResults explore={explore} />
          </CatchGap>
        </CatchGap>
      </CatchBand>
    </CitySiteChrome>
  );
}
