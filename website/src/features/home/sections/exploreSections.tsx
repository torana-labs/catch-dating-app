import {CatchBadge, CatchField, EventThumbnail} from "@catch/web-ui";
import {useState} from "react";
import {ArrowRight, CalendarDays, MapPin, Search, Sparkles, Users} from "lucide-react";
import {exploreCopy as copy} from "@content/explore";
import {consumerHomeCopy} from "@content/consumerHome";
import {activeMarket} from "@content/markets";
import {interpolateContent as fill} from "@content/interpolate";
import {Button, ButtonLink, PlainButton, PlainLink} from "../../../shared/ui/primitives";
import {ConsumerFilters, ConsumerEmpty, ConsumerEventGrid, ConsumerEventLink, ConsumerEventMedia, ConsumerCategory, ConsumerAvailability} from "../../../shared/ui/primitives/consumerHome";
import {ExploreIntro, ExploreSearchForm, ExploreToolbar, ExploreExperience, ExploreResults, ExploreResultsHeading, ExploreExperienceFilter, ExploreFooterInvite} from "../../../shared/ui/primitives/explore";
import type {useExploreController} from "../useExploreController";
type Controller = ReturnType<typeof useExploreController>;
function ExploreSearch({explore}: {explore: Controller}) {
  const [query, setQuery] = useState(explore.filters.query);
  return <ExploreSearchForm role="search" onSubmit={event => {event.preventDefault();explore.update({query:query.trim().slice(0,120)});}}>
    <CatchField
      recipe="input"
      id="explore-query"
      title={copy.search}
      inputHint={copy.placeholder}
      value={query}
      maxLength={120}
      onChanged={(value) => setQuery(value)}
    />
    <Button type="submit"><Search size={18} aria-hidden="true" />{copy.searchAction}</Button>
  </ExploreSearchForm>;
}
export function renderExploreDiscovery(explore: Controller) {
  const active = explore.filters.category !== "all" || explore.filters.query || explore.filters.date !== "any" || explore.filters.experience;
  return <>
    <ExploreIntro aria-labelledby="explore-title"><h1 id="explore-title">{copy.title}</h1><p>{copy.body}</p>
      <ExploreToolbar>
        <CatchField recipe="select" id="explore-city" title={copy.city} values={activeMarket.cities}
          itemLabelBuilder={city => city.label} itemValueBuilder={city => city.slug} value={explore.city}
          onChanged={city => {if (city) explore.update({city: city.slug});}} />
        <ExploreSearch key={explore.filters.query} explore={explore} />
      </ExploreToolbar>
      <ConsumerFilters role="group" aria-label={consumerHomeCopy.filtersLabel}>{consumerHomeCopy.categories.map(item => <PlainButton key={item.id} aria-pressed={explore.filters.category === item.id} onClick={() => explore.update({category:item.id})}>{item.label}</PlainButton>)}</ConsumerFilters>
      <ExploreToolbar>
        <CatchField recipe="select" id="explore-date" title={copy.date} values={copy.dates}
          itemLabelBuilder={item => item.label} itemValueBuilder={item => item.id}
          value={copy.dates.find(item => item.id === explore.filters.date) ?? null}
          onChanged={item => {if (item) explore.update({date: item.id as Controller["filters"]["date"]});}} />
        <ExploreExperienceFilter type="button" aria-pressed={explore.filters.experience} onClick={() => explore.update({experience:!explore.filters.experience})}><Sparkles size={17} aria-hidden="true" />{copy.experienceFilter}</ExploreExperienceFilter>
        {active ? <PlainButton onClick={explore.clear}>{copy.clear}</PlainButton> : null}
      </ExploreToolbar>
      <ExploreExperience><summary><CatchBadge tone="brand" icon={<Sparkles />} label={copy.experienceLabel} />{copy.experienceMore}</summary><h2>{copy.experienceTitle}</h2><p>{copy.experienceBody}</p><p>{copy.experienceChoice}</p></ExploreExperience>
    </ExploreIntro>
    <ExploreResults id="events" aria-labelledby="explore-results-title">
      <ExploreResultsHeading><h2 id="explore-results-title">{copy.results}</h2><p role="status" aria-live="polite">{explore.phase === "ready" ? `${explore.events.length === 1 ? copy.singleCount : fill(copy.count,{count:explore.events.length})} · ${copy.sorted}` : explore.phase === "loading" ? copy.loading : copy.unavailable}</p></ExploreResultsHeading>
      {explore.phase !== "ready" ? <ConsumerEmpty><CalendarDays size={34} aria-hidden="true" /><h3>{explore.phase === "loading" ? copy.loading : copy.unavailable}</h3>{explore.phase === "unavailable" ? <><p>{copy.unavailableBody}</p><Button onClick={() => window.location.reload()}>{copy.retry}</Button></> : null}</ConsumerEmpty> : explore.events.length ?
      <ConsumerEventGrid showAll>{explore.events.map(event => <ConsumerEventLink key={event.eventId} href={event.path}>
        <ConsumerEventMedia><EventThumbnail photoUrl={event.photoUrl} activityKind={event.coverActivityKind} /></ConsumerEventMedia>
        {event.experienceActivities.length ? <CatchBadge tone="brand" icon={<Sparkles />} label={copy.experienceLabel} /> : null}
        <ConsumerCategory category={event.category}>{consumerHomeCopy.categories.find(item => item.id === event.category)?.label}</ConsumerCategory>
        <h3>{event.title}</h3><p><CalendarDays size={17} aria-hidden="true" />{event.date}</p><p><MapPin size={17} aria-hidden="true" />{event.location} · {event.priceLabel}</p><p><Users size={17} aria-hidden="true" />{fill(copy.by,{name:event.listing.name})}</p>
        {event.experienceActivities.length ? <p>{event.experienceActivities.map(item => copy.activities[item]).join(" · ")}</p> : null}
        {event.supply === "external" ? <ConsumerAvailability>{fill(copy.external,{source:event.sourceLabel})}</ConsumerAvailability> : event.availability ? <ConsumerAvailability>{event.availability}</ConsumerAvailability> : null}
      </ConsumerEventLink>)}</ConsumerEventGrid> : <ConsumerEmpty><CalendarDays size={36} aria-hidden="true" /><h3>{explore.cityEvents.length ? copy.noResults : fill(copy.empty,{city:explore.city.label})}</h3><p>{explore.cityEvents.length ? copy.noResultsBody : copy.emptyBody}</p>
        {explore.cityEvents.length ? <Button onClick={explore.clear}>{fill(copy.allEvents,{city:explore.city.label})}</Button> : <Button onClick={() => document.getElementById("explore-city")?.focus()}>{copy.changeCity}</Button>}
        <PlainLink href="/organizers/">{copy.organisers}<ArrowRight size={16} aria-hidden="true" /></PlainLink>
      </ConsumerEmpty>}
    </ExploreResults>
    <ExploreFooterInvite><div><h2>{copy.hostTitle}</h2><p>{copy.hostBody}</p></div><ButtonLink href="/host/" variant="ghost">{copy.hostAction}<ArrowRight size={18} aria-hidden="true" /></ButtonLink></ExploreFooterInvite>
  </>;
}
