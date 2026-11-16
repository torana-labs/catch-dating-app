import {
  CatchAppCaptureImage,
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchComparisonTable,
  CatchCtaSection,
  CatchDeviceFrame,
  CatchFaqSection,
  CatchFeatureTile,
  CatchFormatTile,
  CatchGrid,
  CatchHeroSection,
  CatchNightScene,
  CatchPricingSection,
  CatchQrCode,
  CatchRoot,
  CatchScroller,
  CatchSectionTopBar,
  CatchSplitSection,
  CatchStack,
  CatchStepList,
  CatchStoreButton,
  CatchSurface,
  CatchText,
  useCatch,
  type CatchAppCaptureImageProps,
} from "@catch/web-ui";
import {hostLandingCopy as copy, hostNightCaptureScreen, hostNightFocus, hostNightFormats} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import {brand} from "@content/brand";
import {whatsappChatCopy, whatsappChatHref} from "@content/site";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {captureSlot} from "../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {PricingFeeCalculator} from "../marketing/PricingFeeCalculator";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import {hostLandingHref, useHostLandingController, type HostLandingController} from "./useHostLandingController";

type Host = HostLandingController;

/**
 * Every capture the night scene can show, by slot id. Each slot is named
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

/** Catch Host's official store badges for one placement. */
function HostStoreBadges({placement}: {placement: string}) {
  const stores = useAppDownloadCtas({placement, app: "host"});
  return (
    <CatchStack align="center" direction="row" gap={12} wrap>
      {stores.map((store) => (
        <CatchStoreButton badgeSrc={store.badgeSrc} comingSoon={store.comingSoon} href={store.href || undefined} key={store.store} label={store.accessibleLabel} onClick={store.onClick} store={store.store} />
      ))}
    </CatchStack>
  );
}

/** The hero: the trial first, a person on WhatsApp one tap away (leak 7), and the walkthrough for organisations. */
function Hero({captures}: {captures: CaptureSlots}) {
  const today = captureSlot(captures, "host-today", "eager");
  const hero = copy.hero;
  return (
    <CatchHeroSection
      actions={[
        {label: hero.start, href: "#start"},
        {label: hero.talk, href: whatsappChatHref(whatsappChatCopy.hostQuestionMessage), newTab: true, variant: "secondary"},
      ]}
      ground="coral"
      kicker={hero.kicker}
      lead={hero.body}
      link={{label: hero.walkthrough, href: whatsappChatHref(whatsappChatCopy.walkthroughMessage)}}
      media={today ? <CatchAppCaptureImage {...today} bleed size="md" tilt="right" /> : undefined}
      note={hero.terms}
      title={hero.title}
    />
  );
}

/**
 * Every kind of host: a tile for each format that follows its night below,
 * then where the host is today. The retired routes' anchors (#features,
 * #use-cases, #layers) land here, on the content that replaced them.
 */
function Ways({host}: {host: Host}) {
  const ways = copy.ways;
  return (
    <CatchBand aria-labelledby="host-ways-title" as="section" ground="paper" id="ways">
      <CatchStack gap={32} id="features">
        <CatchBandHeader kicker={ways.kicker} lead={ways.body} title={ways.title} titleId="host-ways-title" />
        <CatchStack gap={0} id="use-cases">
          <CatchScroller gap="related" itemWidth="m" label={ways.label}>
            {hostNightFormats.map((item, index) => (
              <CatchFormatTile body={item.tile} format={item.format} key={item.format} kicker={ways.tileKicker} onPressed={() => host.pickFormat(index, true)}
                photoUrl={item.photo ?? null} pressed={index === host.format} title={item.tileTitle} />
            ))}
          </CatchScroller>
        </CatchStack>
        <CatchStack gap={16} id="layers">
          <CatchText as="h3" tone="secondary" variant="title-row">{ways.stagesTitle}</CatchText>
          <CatchGrid columns={3}>
            {ways.stages.map((stage) => (
              <CatchFeatureTile body={stage.body} ground={stage.ground} key={stage.title} link={{label: stage.link, href: hostLandingHref(stage.to)}} title={stage.title} />
            ))}
          </CatchGrid>
        </CatchStack>
      </CatchStack>
    </CatchBand>
  );
}

function Night({captures, host}: {captures: CaptureSlots; host: Host}) {
  const night = host.night;
  const screens = nightScreens(captures);
  return (
    <CatchSurface aria-labelledby="host-night-title" as="section" block="band" color="ink" id="night">
      <CatchStack gap={16} id="how-it-works">
        <CatchBandHeader kicker={copy.night.kicker} kickerTone="warning" lead={copy.night.lead} title={copy.night.title} titleId="host-night-title" />
      </CatchStack>
      <CatchNightScene
        formats={hostNightFormats.map((item) => ({format: item.format, title: item.title}))}
        frame="capture"
        journey={{
          accent: night.accent,
          event: night.event,
          where: night.where,
          lead: night.lead,
          moments: night.moments.map((moment) => {
            const screen = screens[moment.slot];
            return {
              time: moment.time,
              title: moment.title,
              body: moment.body,
              badge: night.badges[moment.property],
              capture: screen ? {src: screen.src, alt: screen.alt, width: screen.width, height: screen.height,
                screen: hostNightCaptureScreen, focus: hostNightFocus[moment.slot]} : null,
            };
          }),
        }}
        label={host.storyLabel}
        onSelect={(index) => host.pickFormat(index, false)}
        pickerLabel={copy.night.pickerLabel}
        pickerLead={copy.night.pickerLead}
        position={(index, total) => fill(copy.night.position, {index, total})}
        selected={host.format}
        timelineLabel={copy.night.timelineLabel}
      />
    </CatchSurface>
  );
}

function Tablet({captures}: {captures: CaptureSlots}) {
  const tablet = captureSlot(captures, "host-live-tablet");
  return (
    <CatchSplitSection
      kicker={copy.tablet.kicker}
      kickerTone="info"
      lead={copy.tablet.body}
      media={tablet ? <CatchDeviceFrame kind="tablet"><CatchAppCaptureImage {...tablet} caption={undefined} /></CatchDeviceFrame> : undefined}
      title={copy.tablet.title}
    />
  );
}

/** What hosts use today, side by side; the retired #existing-tools anchor lands here. */
function Compare() {
  const compare = copy.compare;
  return (
    <CatchStack gap={0} id="existing-tools">
      <CatchComparisonTable
        checked={compare.checked}
        columns={compare.columns}
        ground="paper"
        highlightColumn={0}
        id="compare"
        kicker={compare.kicker}
        lead={compare.body}
        rowHeader={compare.rowHeader}
        rows={compare.rows}
        source={compare.source}
        title={compare.title}
      />
    </CatchStack>
  );
}

function Pricing() {
  const pricing = copy.pricing;
  return (
    <CatchPricingSection
      actions={[
        {label: pricing.start, href: "#start", variant: "light"},
        {label: pricing.talk, href: whatsappChatHref(pricing.talkMessage), newTab: true, variant: "ghost"},
      ]}
      calculator={<PricingFeeCalculator />}
      cap={pricing.body}
      examples={pricing.examples}
      ground="ink"
      id="pricing"
      kicker={pricing.kicker}
      kickerTone="warning"
      rate={pricing.rate}
      title={pricing.title}
      trial={pricing.terms}
    />
  );
}

/** However the host likes to start: every route ends in the same free trial. */
function Talk() {
  const talk = copy.talk;
  return (
    <CatchBand aria-labelledby="host-talk-title" as="section" id="talk">
      <CatchStack gap={32}>
        <CatchBandHeader align="center" kicker={talk.kicker} lead={talk.body} title={talk.title} titleId="host-talk-title" />
        <CatchGrid columns={4}>
          {talk.paths.map((path) => (
            <CatchFeatureTile body={path.body} ground={path.ground} key={path.title} link={{label: path.link, href: hostLandingHref(path.to)}} title={path.title} />
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
          <CatchButton href={whatsappChatHref(whatsappChatCopy.hostQuestionMessage)} label={faq.ask} size="sm" trailingIcon="forward" variant="quiet" />
        </CatchStack>
      )}
      id="faq"
      items={faq.items.map((item, index) => ({id: `host-faq-${index + 1}`, question: item.title, answer: item.body}))}
      kicker={faq.kicker}
      title={faq.title}
    />
  );
}

/**
 * On a wide screen the store badges open store pages on the desktop, so the
 * start band adds a QR code that opens this band on the phone, and a WhatsApp
 * chat that asks for the link (leak 6). Phones get the badges alone.
 */
function LaptopHandoff() {
  const {sizeClass} = useCatch();
  const start = copy.start;
  if (sizeClass === "compact") return null;
  return (
    <CatchSurface block="floating" padding="md">
      <CatchStack align="center" direction="row" gap={16}>
        <CatchQrCode label={start.qrLabel} value={`${brand.web.origin}/host/#start`} />
        <CatchStack gap={8}>
          <CatchText variant="title-row">{start.qrTitle}</CatchText>
          <CatchText tone="secondary" variant="body-small">{start.qrBody}</CatchText>
          <CatchStack align="start"><CatchButton href={whatsappChatHref(whatsappChatCopy.hostLinkMessage)} label={start.whatsappLink} size="sm" variant="secondary" /></CatchStack>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/** The free-trial start: three steps, Catch Host's badges, the laptop handoff and a person. The retired #apply anchor lands here. */
function Start({captures}: {captures: CaptureSlots}) {
  const start = copy.start;
  const explore = captureSlot(captures, "guest-explore");
  return (
    <CatchCtaSection
      capture={(
        <CatchStack gap={24} id="apply">
          <CatchStepList steps={start.steps} />
          <HostStoreBadges placement="host_start" />
          <LaptopHandoff />
          <CatchStack align="center" direction="row" gap={8} wrap>
            <CatchText variant="body-small">{start.personLead}</CatchText>
            <CatchButton href={whatsappChatHref(whatsappChatCopy.hostQuestionMessage)} label={start.personWhatsapp} size="sm" variant="quiet" />
            <CatchButton href={whatsappChatHref(whatsappChatCopy.walkthroughMessage)} label={start.personWalkthrough} size="sm" variant="quiet" />
          </CatchStack>
          <CatchStack align="center" direction="row" gap={8} wrap>
            <CatchText variant="body-small">{start.weddingsLead}</CatchText>
            <CatchButton href={start.weddingsHref} label={start.weddings} size="sm" trailingIcon="forward" variant="quiet" />
          </CatchStack>
        </CatchStack>
      )}
      flush={explore != null}
      ground="yellow"
      id="start"
      kicker={start.kicker}
      lead={start.body}
      media={explore ? <CatchAppCaptureImage {...explore} bleed size="sm" tilt="left" /> : undefined}
      title={start.title}
    />
  );
}

/**
 * The host landing, band for band as the PlaybookHosts board: the hero,
 * every kind of host, the night scene, the tablet, the comparison, pricing
 * with the shared fee calculator, the ways to start, the FAQ and the
 * free-trial start. The legacy route anchors (#features, #use-cases,
 * #how-it-works, #existing-tools, #layers, #apply) sit on the bands that now
 * carry that content, so retired links still land.
 */
function HostLandingBands({captures, host}: {captures: CaptureSlots; host: Host}) {
  return (
    <>
      <Hero captures={captures} />
      <Ways host={host} />
      <Night captures={captures} host={host} />
      <Tablet captures={captures} />
      <Compare />
      <Pricing />
      <Talk />
      <Faq />
      <Start captures={captures} />
    </>
  );
}

/**
 * The host landing (the PlaybookHosts board) on the white ground: the site
 * header, then the page's sections with Start free trial in the bar that
 * takes its place once you scroll, the board's bands, and the host footer.
 * `captures` are the marketing capture slots (src/app/marketingCaptures.ts).
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
      <PublicSiteFooter tagline={copy.footer.tagline} variant="host" />
    </CatchRoot>
  );
}
