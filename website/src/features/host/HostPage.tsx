import {useState} from "react";
import {
  CatchAppCaptureImage,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchCardGrid,
  CatchChip,
  CatchCtaSection,
  CatchFaqSection,
  CatchFeatureTile,
  CatchGrid,
  CatchHeroSection,
  CatchLinkedText,
  CatchQrCode,
  CatchRoot,
  CatchRouteCard,
  CatchSectionTopBar,
  CatchSiteDock,
  CatchStack,
  CatchStepCards,
  CatchText,
  CatchTimelineSection,
  useCatch,
  type CatchAppCaptureImageProps,
} from "@catch/web-ui";
import {appDownloadCopy} from "@content/appDownload";
import {hostLandingCopy as copy, hostNightFormats} from "@content/hostLanding";
import {brand} from "@content/brand";
import {hostWalkthroughHref, whatsappChatCopy, whatsappChatHref} from "@content/site";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {captureSlot} from "../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {AppDownloadQr} from "../marketing/AppDownloadQr";
import {AppLinkCapture} from "../marketing/AppLinkCapture";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import {linkedParts} from "../../shared/text/linkedParts";
import {PricingFeeBand} from "../marketing/PricingBands";
import {hostLandingHref, useHostLandingController, type HostLandingController} from "./useHostLandingController";

type Host = HostLandingController;

/**
 * A retired route's anchor (#features, #how-it-works …), an empty mark just
 * before the band that now carries its content, so old links still land
 * there. It sits beside the band rather than around it: a panel keeps its
 * gap to the band above only when nothing wraps it.
 */
function RetiredAnchor({id}: {id: string}) {
  return <CatchStack aria-hidden="true" gap={0} id={id} />;
}

/**
 * Every capture the night band can show, by slot id. Each slot is named
 * literally so tool/marketing/capture_manifest.json's page bindings can be
 * checked against the page (marketingCaptures.test.tsx).
 */
function nightScreens(captures: CaptureSlots): Record<string, CatchAppCaptureImageProps | null> {
  return {
    "host-formats-pods": captureSlot(captures, "host-formats-pods"),
    "host-door-in": captureSlot(captures, "host-door-in"),
    "host-door-arriving": captureSlot(captures, "host-door-arriving"),
    "host-formats-mix": captureSlot(captures, "host-formats-mix"),
    "host-live-console": captureSlot(captures, "host-live-console"),
    "host-live-needs": captureSlot(captures, "host-live-needs"),
    "host-live-scores": captureSlot(captures, "host-live-scores"),
    "host-post-event-report": captureSlot(captures, "host-post-event-report"),
    "host-formats-rules": captureSlot(captures, "host-formats-rules"),
    "host-formats-courts-setup": captureSlot(captures, "host-formats-courts-setup"),
    "host-formats-courts": captureSlot(captures, "host-formats-courts"),
    "host-formats-crawl": captureSlot(captures, "host-formats-crawl"),
    "host-formats-crawl-move": captureSlot(captures, "host-formats-crawl-move"),
  };
}

/** The hero's laptop card's action (wide screens only, leak 6): a WhatsApp chat that asks for the link, as a text link like the start band's. */
function LaptopLink() {
  return <CatchButton href={whatsappChatHref(appDownloadCopy.host.whatsappMessage)} label={appDownloadCopy.host.whatsappLink} newTab recipe="text" tone="neutral" />;
}

/** The coral hero: the trial first, a person on WhatsApp one tap away (leak 7), the walkthrough for organisations and, on a laptop, the QR card. */
function Hero({captures}: {captures: CaptureSlots}) {
  const {sizeClass} = useCatch();
  const today = captureSlot(captures, "host-today", "eager");
  const hero = copy.hero;
  return (
    <CatchHeroSection
      actions={[
        {label: hero.start, href: "#start"},
        {label: hero.talk, href: whatsappChatHref(whatsappChatCopy.hostQuestionMessage), newTab: true, variant: "secondary"},
      ]}
      ground="coral"
      id="top-hero"
      kicker={hero.kicker}
      lead={hero.body}
      link={{label: hero.walkthrough, href: hostWalkthroughHref}}
      linkLead={hero.walkthroughLead}
      media={today ? <CatchAppCaptureImage {...today} bleed caption={undefined} size="hero" tilt="left" /> : undefined}
      note={hero.terms}
      // A phone already has the stores a tap away (the start band and the dock); the card is for a laptop.
      notice={sizeClass === "compact" ? undefined : {
        title: appDownloadCopy.host.title,
        // The QR code opens the start band on the phone, where both store buttons are.
        leading: <CatchQrCode label={appDownloadCopy.host.qrLabel} size="s" value={`${brand.web.origin}/host/#start`} />,
        children: <LaptopLink />,
      }}
      title={hero.title}
    />
  );
}

/**
 * Find your page: a card for each format the page follows, each to that
 * format's page for hosts, then chips to the other formats' pages and, under
 * "By organisation", to the organisation pages, weddings and programmes (the
 * board's band). The retired routes' anchors (#features, #use-cases) land
 * here, on the content that replaced them.
 */
function Ways() {
  const ways = copy.ways;
  return (
    <>
      <RetiredAnchor id="features" />
      <RetiredAnchor id="use-cases" />
      <CatchCardGrid
          chipGroups={[{title: ways.organisationsTitle, chips: ways.organisations}]}
          chips={ways.chips}
          columns={5}
          ground="paper"
          id="ways"
          items={hostNightFormats.map((item) => ({
            id: item.format, title: item.tileTitle, body: item.tile, more: item.pageLink, href: item.page,
            ground: item.accent, format: item.format, photoUrl: item.photo ?? null,
          }))}
          kicker={ways.kicker}
          kickerAccent="mint"
          kind="format"
          layout="rail"
          lead={ways.body}
          title={ways.title}
        />
    </>
  );
}

/** Where the host is today: three ways in, each a filled card. The retired #layers anchor lands here. */
function Stages() {
  const ways = copy.ways;
  return (
    <CatchBand aria-labelledby="host-stages-title" as="section" id="layers">
      <CatchStack gap={24}>
        <CatchBandHeader level={2} size="small" title={ways.stagesTitle} titleId="host-stages-title" />
        <CatchGrid columns={3}>
          {ways.stages.map((stage) => (
            <CatchRouteCard action={{label: stage.link, href: hostLandingHref(stage.to), newTab: "whatsapp" in stage.to}} body={stage.body}
              ground={stage.ground} key={stage.title} title={stage.title} />
          ))}
        </CatchGrid>
      </CatchStack>
    </CatchBand>
  );
}

/** On the night: the picked format's evening, moment by moment, beside the chosen moment's screen. The retired #how-it-works anchor lands here. */
function Night({captures, host}: {captures: CaptureSlots; host: Host}) {
  const night = host.night;
  const moment = night.moments[host.moment];
  const screen = nightScreens(captures)[moment.slot];
  return (
    <>
      <RetiredAnchor id="how-it-works" />
      <CatchTimelineSection
        id="night"
        kicker={copy.night.kicker}
        lead={copy.night.lead}
        media={screen ? <CatchAppCaptureImage {...screen} bleed caption={undefined} size="md" /> : undefined}
        moments={night.moments.map((item) => ({time: item.time, title: item.title, body: item.body}))}
        onSelect={host.pickMoment}
        picker={(
          <CatchStack gap={8}>
            <CatchText tone="secondary" variant="body-meta">{copy.night.pickerLead}</CatchText>
            <CatchStack aria-label={copy.night.pickerLabel} direction="row" gap={8} role="radiogroup" wrap>
              {hostNightFormats.map((item, index) => (
                <CatchChip colourWhenSelected dot={item.format} key={item.format} kind="choice" label={item.title}
                  onPressed={() => host.pickFormat(index, false)} selected={index === host.format} />
              ))}
            </CatchStack>
          </CatchStack>
        )}
        selected={host.moment}
        timelineLabel={host.storyLabel}
        title={copy.night.title}
      />
    </>
  );
}

/** What hosts use today, side by side; the retired #existing-tools anchor lands here. */
/**
 * Why hosts switch: the three things only Catch does, as tiles, then a link to
 * the full comparison on /pricing/ (#compare). The full table is too much for
 * a page that sells; the pricing page carries it (21 Nov 2026).
 */
function Compare() {
  const words = copy.switch;
  return (
    <>
      <RetiredAnchor id="existing-tools" />
      <CatchBand aria-labelledby="compare-title" as="section" ground="paper" id="compare">
        <CatchStack gap={24}>
          <CatchBandHeader kicker={words.kicker} title={words.title} titleId="compare-title" />
          <CatchGrid columns={3}>
            {words.tiles.map((tile) => <CatchFeatureTile body={tile.body} ground={tile.ground} key={tile.title} title={tile.title} />)}
          </CatchGrid>
          <CatchLinkedText parts={[words.compareLead, {label: words.compareLink, href: words.compareHref, arrow: true}]} tone="primary" />
        </CatchStack>
      </CatchBand>
    </>
  );
}

/** The fee band on ink: the rate, what it includes, the trial and full pricing, the shared calculator, three worked examples and the organisations line. */
function Pricing() {
  const pricing = copy.pricing;
  return (
    <PricingFeeBand
      actions={[
        {label: pricing.start, href: "#start", variant: "light"},
        {label: pricing.full, href: pricing.fullHref, variant: "ghost"},
      ]}
      examples={pricing.examples}
      foot={{text: pricing.organisations, action: {label: pricing.talk, href: whatsappChatHref(pricing.talkMessage), newTab: true, variant: "ghost"}}}
      id="pricing"
      kicker={pricing.kicker}
      labels={pricing.included}
      rateTitle={pricing.title}
    />
  );
}

/** However the host likes to start: every route ends in the same free trial. The "see it" route shows the live console on the iPad. */
function Talk({captures}: {captures: CaptureSlots}) {
  const talk = copy.talk;
  const tablet = captureSlot(captures, "host-live-tablet");
  return (
    <CatchBand aria-labelledby="host-talk-title" as="section" id="talk">
      <CatchStack gap={40}>
        <CatchBandHeader align="center" kicker={talk.kicker} kickerAccent="indigo" lead={talk.body} size="section" title={talk.title} titleId="host-talk-title" />
        <CatchGrid columns={4}>
          {talk.paths.map((path, index) => (
            <CatchRouteCard
              action={{label: path.link, href: hostLandingHref(path.to), newTab: "whatsapp" in path.to, variant: path.ground === "ink" ? "light" : index === 1 ? "secondary" : "primary"}}
              body={path.body}
              ground={path.ground}
              key={path.title}
              kicker={path.kicker}
              kind="button"
              media={index === 1 && tablet ? <CatchAppCaptureImage {...tablet} caption={undefined} device={undefined} /> : undefined}
              title={path.title}
            />
          ))}
        </CatchGrid>
      </CatchStack>
    </CatchBand>
  );
}

function Faq() {
  const faq = copy.faq;
  return (
    <CatchFaqSection
      defaultOpen={[]}
      footer={(
        <CatchStack align="center" direction="row" gap={8} wrap>
          <CatchText variant="body">{faq.elsewhere}</CatchText>
          <CatchButton href={whatsappChatHref(whatsappChatCopy.hostQuestionMessage)} label={faq.ask} newTab size="sm" trailingIcon="forward" variant="quiet" />
        </CatchStack>
      )}
      id="faq"
      items={faq.items.map((item, index) => ({id: `host-faq-${index + 1}`, question: item.title, answer: item.body}))}
      kicker={faq.kicker}
      title={faq.title}
    />
  );
}

/** The free-trial start on yellow: three steps, Catch Host's badges, a person and weddings, beside Explore. The retired #apply anchor lands here. */
/**
 * The yellow free-trial start. The three steps are a picker: each shows its own
 * Catch Host screen beside the list (the app's home, a first event, payments).
 * The other ways in are two sentences with their links inside. Then "Text me
 * the link" (the site's one app link capture), right above the badges it
 * points at. Phones get the store badges; wider pages the QR code that opens
 * this band on the phone and the WhatsApp link, as every band that offers an
 * app does.
 */
function Start({captures}: {captures: CaptureSlots}) {
  const start = copy.start;
  const [step, setStep] = useState(0);
  const screens = [
    captureSlot(captures, "host-today"),
    captureSlot(captures, "host-create-first-event"),
    captureSlot(captures, "host-payments"),
  ];
  const screen = screens[step] ?? screens[0];
  const stores = useAppDownloadCtas({placement: "host_start", app: "host"});
  return (
    <CatchCtaSection
      capture={(
        <CatchStack gap={20} id="apply">
          <CatchStepCards current={step} on="colour" onSelected={setStep} steps={start.steps} />
          <CatchStack gap={8}>
            <CatchLinkedText parts={linkedParts(start.personLine, {
              whatsapp: {label: start.personWhatsapp, href: whatsappChatHref(whatsappChatCopy.hostQuestionMessage), newTab: true},
              walkthrough: {label: start.personWalkthrough, href: hostWalkthroughHref},
            })} tone="primary" />
            <CatchLinkedText parts={linkedParts(start.weddingsLine, {weddings: {label: start.weddings, href: start.weddingsHref, arrow: true}})} tone="primary" />
          </CatchStack>
          <AppLinkCapture />
        </CatchStack>
      )}
      ground="yellow"
      id="start"
      kicker={start.kicker}
      lead={start.body}
      media={screen ? <CatchAppCaptureImage {...screen} caption={undefined} size="md" /> : undefined}
      stores={stores.map((store) => ({badgeSrc: store.badgeSrc, comingSoon: store.comingSoon, href: store.href || undefined, label: store.accessibleLabel,
        onClick: store.onClick, store: store.store}))}
      storesWide={<AppDownloadQr app="host" value={`${brand.web.origin}/host/#start`} />}
      title={start.title}
    />
  );
}

/**
 * The host landing, band for band as the PlaybookHosts board: the coral
 * hero, find your page (each format and organisation to its page), where
 * you are today, on the night, the comparison, the fee band with the shared
 * calculator, the ways to start, the FAQ and the yellow free-trial start.
 * The legacy route anchors (#features, #use-cases, #how-it-works,
 * #existing-tools, #layers, #apply) sit on the bands that now carry that
 * content, so retired links still land. The board's proof, story, no-show
 * tool and referral bands wait for real data and backends.
 */
function HostLandingBands({captures, host}: {captures: CaptureSlots; host: Host}) {
  return (
    <>
      <Hero captures={captures} />
      <Ways />
      <Stages />
      <Night captures={captures} host={host} />
      <Compare />
      <Pricing />
      <Talk captures={captures} />
      <Faq />
      <Start captures={captures} />
    </>
  );
}

/**
 * The host landing (the PlaybookHosts board) on the white ground: the site
 * header, then the page's sections with Start free trial in the bar that
 * takes its place once you scroll, the board's bands, the host footer and
 * the phone action bar. `captures` are the marketing capture slots
 * (src/app/marketingCaptures.ts).
 */
export function HostPage({captures}: {captures: CaptureSlots}) {
  const host = useHostLandingController();
  return (
    <CatchRoot theme="day">
      {/* A host page's primary action is the trial, never the guest app (leak 3). */}
      <PublicSiteHeader actions={<CatchButton href="#start" label={copy.sections.start} size="sm" />} variant="host" />
      <CatchSectionTopBar action={<CatchButton href="#start" label={copy.sections.start} size="sm" />} label={copy.sections.label} sections={copy.sections.items} />
      <WebsitePageMain id="top">
        <HostLandingBands captures={captures} host={host} />
      </WebsitePageMain>
      <PublicSiteFooter helpTitle={copy.footer.helpTitle} tagline={copy.footer.tagline} variant="host" />
      <CatchSiteDock label={copy.dock.label} primary={{label: copy.dock.start, href: "#start"}}
        whatsapp={{label: copy.dock.whatsapp, href: whatsappChatHref(whatsappChatCopy.hostQuestionMessage)}} />
    </CatchRoot>
  );
}
