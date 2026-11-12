import {CatchBand, CatchButton, CatchGap, CatchGrid, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {citiesPageCopy as copy} from "@content/citiesPage";
import type {CitiesPageController, CitiesPageRow} from "../useCitiesPageController";
import {CitySiteChrome} from "./cityChrome";

// A link button's press only navigates.
const follow = () => undefined;

function CityRow({row}: {row: CitiesPageRow}) {
  return (
    <CatchSurface block="tile" padding="md">
      <CatchStack gap={12}>
        <CatchStack gap={4}>
          <CatchText as="h3" variant="title-row">{row.label}</CatchText>
          {row.note ? <CatchText tone="secondary" variant="body-meta">{row.note}</CatchText> : null}
        </CatchStack>
        <CatchButton href={row.href} label={row.action} onPressed={follow} size="sm" variant={row.live ? "primary" : "secondary"} />
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * /cities/: every listed city, country by country, open cities first in
 * catalog order. Each city offers its page or the launch notice.
 */
export function CitiesPageSections({cities}: {cities: CitiesPageController}) {
  return (
    <CitySiteChrome cities={cities.cities} city={cities.city} exploreHref={cities.exploreHref} onChooseCity={cities.chooseCity}>
      <CatchBand aria-labelledby="cities-title" pb="spacious" pt="compact">
        <CatchGap size="majorSection">
          <CatchStack gap={8}>
            <CatchText tone="secondary" variant="label-kicker">{copy.eyebrow}</CatchText>
            <CatchText as="h1" id="cities-title" variant="display-xl">{copy.title}</CatchText>
            <CatchText tone="secondary" variant="body-lead">{copy.lead}</CatchText>
          </CatchStack>
          {cities.unavailable ? <CatchText role="status" variant="body">{copy.unavailable}</CatchText> : null}
          {cities.groups.map((group) => (
            <CatchStack aria-labelledby={`cities-${group.isoCode}`} as="section" gap={16} key={group.isoCode}>
              <CatchStack gap={4}>
                <CatchText as="h2" id={`cities-${group.isoCode}`} variant="display-sm">{group.name}</CatchText>
                {group.note ? <CatchText tone="secondary" variant="body">{group.note}</CatchText> : null}
              </CatchStack>
              <CatchGrid columns={4} compactColumns={2}>
                {group.rows.map((row) => <CityRow key={row.slug} row={row} />)}
              </CatchGrid>
            </CatchStack>
          ))}
        </CatchGap>
      </CatchBand>
    </CitySiteChrome>
  );
}
