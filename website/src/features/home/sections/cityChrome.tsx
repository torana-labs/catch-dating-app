import {CatchButton} from "@catch/web-ui";
import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {countryName} from "@content/markets";
import {guestAppHref, siteFooterCopy, siteHeaderCopy} from "@content/site";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain, type SiteFooterCity, type SiteFooterCityPages, type SiteNavItem} from "../../../shared/site";
import type {CityDiscoveryLinks} from "../../discovery/discoveryModel";
import {citiesHref, cityFooterNote, cityGroups} from "../homeModel";

export {citiesHref};
import {CityPicker} from "./CityPicker";
import type {HomeCity} from "../homeTypes";

// A link button's press only navigates.
const follow = () => undefined;

/** Where a city's pages live: its city page for Explore and the footer, the homepage for the picker. */
export const cityPagePath = (slug: string) => ["", encodeURIComponent(slug), ""].join("/");

/**
 * The footer's Cities column: open cities with their honest note, one
 * "launching soon" line for each country with no city open, then More cities.
 */
export function footerCities(cities: readonly HomeCity[]): SiteFooterCity[] {
  const groups = cityGroups(cities, countryName);
  return [
    ...cities.filter((item) => item.status === "live")
      .map((item) => ({href: cityPagePath(item.slug), label: item.label, soon: false, note: cityFooterNote(item)})),
    ...groups.filter((group) => !group.anyLive)
      .map((group) => ({href: citiesHref, label: fill(siteFooterCopy.countrySoon, {country: group.name}), soon: false})),
    {href: citiesHref, label: siteFooterCopy.moreCities, soon: false},
  ];
}

/**
 * A city's discovery pages in the chrome: "New to <city>" for the header,
 * after What's on, and for the footer's Explore column, then its format
 * pages as the footer's "Things to do in <city>" column. Only pages that
 * exist are linked (cityDiscoveryLinks).
 */
export function cityChromeLinks(city: HomeCity, discovery?: CityDiscoveryLinks): {newToCity?: SiteNavItem; cityFormats?: SiteFooterCityPages} {
  if (!discovery) return {};
  const newToCity = discovery.newToCity ? {href: discovery.newToCity, label: fill(siteHeaderCopy.guest.newToCity, {city: city.label})} : undefined;
  return {
    newToCity,
    cityFormats: {newToCity, title: fill(siteFooterCopy.cityFormats, {city: city.label}), formats: discovery.formats.map(({href, label}) => ({href, label}))},
  };
}

/**
 * The header and footer around a city's page (Explore and the city pages).
 * The header is the one public header, as on the homepage: the city picker
 * with each city's status sits left of Get the app. The footer lists every
 * city, the ones not open marked soon.
 */
export function CitySiteChrome({appHref = guestAppHref, children, cities, city, discovery, dock, exploreHref, onChooseCity, showWhatsOn = true}: {
  /** Where Get the app goes: the guest app page (/app/), or on the homepage itself its own band. */
  appHref?: string;
  children: ReactNode;
  cities: readonly HomeCity[];
  city: HomeCity;
  /** The city's new-to-the-city page and format pages that exist, linked from the header and footer. */
  discovery?: CityDiscoveryLinks;
  /** The phone action bar, after the footer. */
  dock?: ReactNode;
  exploreHref: string;
  onChooseCity: (slug: string) => void;
  /**
   * The header's What's on link. A city with no plan in the next 30 days
   * hides it (the read model's hasUpcomingMonth); shown when unknown.
   */
  showWhatsOn?: boolean;
}) {
  const links = cityChromeLinks(city, discovery);
  return <>
    <PublicSiteHeader
      actions={<>
        <CityPicker cities={cities} onChoose={onChooseCity} selected={city} />
        <CatchButton href={appHref} label={copy.header.app} onPressed={follow} size="sm" />
      </>}
      newToCity={links.newToCity}
      showWhatsOn={showWhatsOn}
      whatsOnHref={exploreHref}
    />
    <WebsitePageMain id="top">{children}</WebsitePageMain>
    <PublicSiteFooter appHref={appHref} cities={footerCities(cities)} cityFormats={links.cityFormats} exploreHref={exploreHref} />
    {dock}
  </>;
}
