import type {ReactNode} from "react";
import {PlainLink} from "../ui/primitives";
import {slugForTracking, trackSiteCtaClick} from "./siteTracking";

export interface SiteNavItem {
  href: string;
  label: string;
}

export function SiteFooter({
  brandHref,
  body,
  links,
  children,
}: {
  brandHref: string;
  body: string;
  links: SiteNavItem[];
  /** Controls after the links, in the same row (the site's "Privacy choices"). */
  children?: ReactNode;
}) {
  return (
    <footer className="site-footer">
      <PlainLink className="brand" href={brandHref} aria-label={"Catch home"}>
        <img alt="" aria-hidden="true" className="brand__logo brand__logo--on-light"
          src="/assets/branding/catch_splash_mark_light.png" />
        <img alt="" aria-hidden="true" className="brand__logo brand__logo--on-dark"
          src="/assets/branding/catch_splash_mark_dark.png" />
      </PlainLink>
      <p>{body}</p>
      <nav aria-label={"Footer"}>
        {links.map((link) => (
          <PlainLink
            href={link.href}
            key={`${link.href}-${link.label}`}
            onClick={() => trackSiteCtaClick(`footer_${slugForTracking(link.label)}`, link.href)}
          >
            {link.label}
          </PlainLink>
        ))}
        {children}
      </nav>
    </footer>
  );
}
