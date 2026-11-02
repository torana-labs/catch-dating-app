"use client";
import {useEffect} from "react";
import {reportCaughtError} from "@catch/web-config/errorReporting";
import {availabilityCopy} from "../src/content/availability";
import {routeRecoveryCopy} from "../src/content/routeRecovery";
import {PublicProviders} from "../src/app/next/PublicProviders";
import {PageShell, PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../src/shared/site";
import {Button, ButtonLink, EmptyState} from "../src/shared/ui/primitives";

/** Render failures after the proxy's catalog preflight, such as the public read
 * bound being crossed between the two reads. Next keeps the 500 status. */
export default function PublicRouteError({error}: {error: Error}) {
  useEffect(() => reportCaughtError(error), [error]);
  return <PublicProviders pathname="/" catalog={{listings: [], readAt: 0}} live={false}>
    <PageShell pageClassName="not-found-page">
      <PublicSiteHeader />
      <WebsitePageMain id="top">
        <section role="alert" aria-labelledby="public-route-error-title">
          <EmptyState variant="public-event">
            <h1 id="public-route-error-title">{availabilityCopy.title}</h1>
            <p>{availabilityCopy.body}</p>
            <Button type="button" onClick={() => window.location.reload()}>{availabilityCopy.retry}</Button>
            <ButtonLink href="/" variant="ghost">{routeRecoveryCopy.home}</ButtonLink>
          </EmptyState>
        </section>
      </WebsitePageMain>
      <PublicSiteFooter />
    </PageShell>
  </PublicProviders>;
}
