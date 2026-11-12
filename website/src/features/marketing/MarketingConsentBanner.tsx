import {websiteCopy} from "@content/generated";
import {marketingConsentPreferencesCopy as copy} from "../../content/marketingConsent";
import {useEffect, useRef, useState} from "react";
import {
  getMarketingConsent,
  marketingConsentChangedEvent,
  marketingConsentOpenEvent,
  setMarketingConsent,
  shouldShowMarketingConsentBanner,
} from "../../analytics";
import {Button, MarketingConsentBannerShell} from "../../shared/ui/primitives";

/**
 * The consent banner. It shows until a current choice exists; afterwards the
 * footer's "Privacy choices" (shared/site `PrivacyChoicesButton`) reopens it
 * through `marketingConsentOpenEvent`, so no control floats over the page.
 */
export function MarketingConsentBanner({serverRendered = false}: {serverRendered?: boolean} = {}) {
  // Public SSR stays viewer-independent. Match that first client render, then
  // reconcile browser storage without delaying the initial consent content.
  const [consent, setConsent] = useState(() => serverRendered ? null : getMarketingConsent());
  const [editing, setEditing] = useState(false);
  const reopened = useRef(false);

  useEffect(() => {
    const changed = () => setConsent(getMarketingConsent());
    const open = () => {reopened.current = true; setEditing(true);};
    changed();
    window.addEventListener(marketingConsentChangedEvent, changed);
    window.addEventListener(marketingConsentOpenEvent, open);
    return () => {
      window.removeEventListener(marketingConsentChangedEvent, changed);
      window.removeEventListener(marketingConsentOpenEvent, open);
    };
  }, []);
  const showing = editing || shouldShowMarketingConsentBanner(consent);

  // Phones dock the banner to the bottom edge; the page is padded by its
  // measured height (site-footer.css) so the last band and the footer can
  // still scroll clear of it.
  useEffect(() => {
    if (!showing || typeof document === "undefined") return;
    const root = document.documentElement;
    const banner = document.querySelector<HTMLElement>(".consent-banner");
    root.dataset.consentOpen = "";
    const measure = () => root.style.setProperty("--consent-banner-height", `${banner?.offsetHeight ?? 0}px`);
    measure();
    const observer = typeof ResizeObserver === "function" && banner ? new ResizeObserver(measure) : null;
    if (banner) observer?.observe(banner);
    // Reopened from the footer: take focus so keyboard and screen-reader users land on the choices.
    if (reopened.current) {
      reopened.current = false;
      banner?.focus();
    }
    return () => {
      observer?.disconnect();
      delete root.dataset.consentOpen;
      root.style.removeProperty("--consent-banner-height");
    };
  }, [showing]);

  const choose = (choice: "accepted" | "analytics" | "essential") => {
    setConsent(setMarketingConsent(choice));
    setEditing(false);
  };
  if (!showing) return null;

  return (
    <MarketingConsentBannerShell
      aria-label={websiteCopy["marketingconsentbanner_0328"]}
      tabIndex={-1}
      body={copy.body}
      detailsLabel={copy.details}
      summary={copy.summary}
      actions={
        <>
          {/* Equal weight, least to most data: no choice is promoted over another (owner decision). */}
          <Button size="small" type="button" variant="ghost" onClick={() => choose("essential")}>
            {websiteCopy["marketingconsentbanner_0330"]}
          </Button>
          <Button size="small" type="button" variant="ghost" onClick={() => choose("analytics")}>{copy.allowAnalytics}</Button>
          <Button size="small" type="button" variant="ghost" onClick={() => choose("accepted")}>{copy.allowMarketing}</Button>
        </>
      }
    />
  );
}
