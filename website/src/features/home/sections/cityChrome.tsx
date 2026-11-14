import {homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {countryName} from "@content/markets";
import {siteFooterCopy} from "@content/site";
import type {ReactNode} from "react";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain, type SiteFooterCity} from "../../../shared/site";
import {citiesHref, cityFooterNote, cityGroups} from "../homeModel";

export {citiesHref};
import {CityPicker} from "./CityPicker";
import type {HomeCity} from "../homeTypes";

// A link button's press only navigates.
const follow = () => undefined;

/** Where a city's pages live: its city page for Explore and the footer, the homepage for the picker. */
export const cityPagePath = (slug: string) => ["", encodeURIComponent(slug), ""].join("/");
export const organisersHref = "/explore/?show=organisers";

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
 * The header and footer around a city's page (Explore and the city pages).
 * The header is the one public header, as on the homepage: the city picker
 * with each city's status sits left of Get the app. The footer lists every
 * city, the ones not open marked soon.
 */
export function CitySiteChrome({appHref = "/#app", children, cities, city, exploreHref, onChooseCity}: {
  /** The get-the-app band: on the homepage itself, its own anchor. */
  appHref?: string;
  children: ReactNode;
  cities: readonly HomeCity[];
  city: HomeCity;
  exploreHref: string;
  onChooseCity: (slug: string) => void;
}) {
  return <>
    <PublicSiteHeader
      actions={<CityPicker cities={cities} onChoose={onChooseCity} selected={city} />}
      links={[
        {href: exploreHref, label: copy.header.explore},
        {href: organisersHref, label: copy.header.organisers},
        {href: "/host/", label: copy.header.hosts},
      ]}
      primary={{href: appHref, label: copy.header.app, onPressed: follow}}
    />
    <WebsitePageMain id="top">{children}</WebsitePageMain>
    <PublicSiteFooter appHref={appHref} exploreHref={exploreHref}
      cities={footerCities(cities)} />
  </>;
}
