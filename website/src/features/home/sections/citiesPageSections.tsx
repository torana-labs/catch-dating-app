import {CatchCardGrid, CatchText, type CatchCardGridCity} from "@catch/web-ui";
import {citiesPageCopy as copy} from "@content/citiesPage";
import type {CitiesPageController, CitiesPageRow} from "../useCitiesPageController";
import {CitySiteChrome} from "./cityChrome";

/**
 * A city as the board's city card: an open city takes the Open tag and its
 * plans line; a launching city its launch tag and its country.
 */
function cityCard(row: CitiesPageRow, country: string): CatchCardGridCity {
  return {
    id: row.slug,
    title: row.label,
    live: row.live,
    status: row.live ? copy.open : row.note ?? copy.soon,
    body: row.live ? row.note : country,
    action: {href: row.href, label: row.action},
  };
}

/**
 * /cities/ on the LiveCities board: the kit's city cards, country by
 * country, open cities first in catalog order. The first country's grid
 * carries the page's head; each city offers its page or the launch notice.
 */
export function CitiesPageSections({cities}: {cities: CitiesPageController}) {
  const [first, ...rest] = cities.groups;
  // Under the head: the unavailable notice, or the first country's launch note when none of its cities is open.
  const status = cities.unavailable ? <CatchText as="p" role="status" variant="body">{copy.unavailable}</CatchText> :
    first?.note ? <CatchText as="p" tone="secondary" variant="body">{first.note}</CatchText> : undefined;
  return (
    <CitySiteChrome cities={cities.cities} city={cities.city} discovery={cities.discovery} exploreHref={cities.exploreHref} onChooseCity={cities.chooseCity}>
      <CatchCardGrid
        columns={4}
        empty={{title: copy.unavailable}}
        filters={status}
        items={first ? first.rows.map((row) => cityCard(row, first.name)) : []}
        kicker={copy.eyebrow}
        kind="city"
        lead={copy.lead}
        level={1}
        title={copy.title}
      />
      {rest.map((group) => (
        <CatchCardGrid
          columns={4}
          items={group.rows.map((row) => cityCard(row, group.name))}
          key={group.isoCode}
          kind="city"
          lead={group.note}
          title={group.name}
        />
      ))}
    </CitySiteChrome>
  );
}
