import {CatchButton, CatchMenu, CatchSiteFooter, CatchSiteHeader} from "@catch/web-ui";
import {homePageCopy as copy} from "@content/homePage";
import {siteFooterLegalLinks} from "@content/site";
import type {ReactNode} from "react";
import {WebsitePageMain} from "../../../shared/site";
import {cityStatusLabel} from "../homeModel";
import type {HomeCity} from "../homeTypes";

// A link button's press only navigates.
const follow = () => undefined;

/** Where a city's pages live: its city page for Explore and the footer, the homepage for the picker. */
export const cityPagePath = (slug: string) => ["", encodeURIComponent(slug), ""].join("/");
export const organisersHref = "/explore/?show=organisers";

/**
 * The Website v2 header and footer around a city's page: the homepage and
 * Explore. The header carries the city picker with each city's status; the
 * footer lists every city, the ones not open marked soon.
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
  const links = copy.footer.links;
  return <>
    <CatchSiteHeader
      actions={
        <CatchMenu
          align="end"
          builder={(menu) => (
            <CatchButton {...menu.triggerProps} label={city.label} onPressed={menu.toggle} size="md" variant="secondary" />
          )}
          items={cities.map((item) => ({value: item.slug, label: item.label, sublabel: cityStatusLabel(item),
            selected: item.slug === city.slug, variant: "choice" as const}))}
          label={copy.header.cityMenu}
          onSelected={onChooseCity}
          recipe="anchored"
          width={300}
        />
      }
      brandHref="/"
      brandLabel="Catch"
      links={[
        {href: exploreHref, label: copy.header.explore},
        {href: organisersHref, label: copy.header.organisers},
        {href: "/host/", label: copy.header.hosts, compact: true},
      ]}
      navLabel={copy.header.nav}
      wideActions={<CatchButton href={appHref} label={copy.header.app} onPressed={follow} size="md" />}
    />
    <WebsitePageMain id="top">{children}</WebsitePageMain>
    <CatchSiteFooter
      brandHref="/"
      brandLabel="Catch"
      groups={[
        {title: copy.footer.groups.explore, links: [{href: exploreHref, label: links.whatsOn}, {href: organisersHref, label: links.organisers}, {href: appHref, label: links.app}]},
        {title: copy.footer.groups.cities, links: cities.map((item) => ({href: cityPagePath(item.slug), label: item.label,
          note: item.status === "live" ? undefined : copy.footer.soon}))},
        {title: copy.footer.groups.hosts, links: [{href: "/host/", label: links.hosts}, {href: "/host/#pricing", label: links.pricing}, {href: "/claim/", label: links.claim}]},
        {title: copy.footer.groups.help, links: siteFooterLegalLinks.map((link) => ({href: link.href, label: link.label}))},
      ]}
      navLabel={copy.footer.nav}
      tagline={copy.footer.tagline}
    />
  </>;
}
