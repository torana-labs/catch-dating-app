import {
  CatchAccordion,
  CatchAppCaptureImage,
  CatchButton,
  CatchDeviceFrame,
  CatchFormatMatrix,
  CatchFormatTile,
  CatchIndexRow,
  CatchLayerMap,
  CatchMeter,
  CatchMetricTile,
  CatchNightScene,
  CatchPageTabBar,
  CatchPipelineBoard,
  CatchRangeInput,
  CatchRoot,
  CatchScroller,
  CatchSection,
  CatchStack,
  CatchStepList,
  CatchStoreButton,
  CatchSurface,
  CatchText,
  type CatchAppCaptureImageProps,
} from "@catch/web-ui";
import {hostLandingCopy as copy, hostNightFormats} from "@content/hostLanding";
import {interpolateContent as fill} from "@content/interpolate";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {captureSlot} from "../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {useAppDownloadCtas} from "../marketing/useAppDownloadCtas";
import {feeCap, salesRange, useHostLandingController, type HostLandingController} from "./useHostLandingController";

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

/** A headline across from its lead on a wide page. */
function HeadingRow({id, title, body, anchor}: {id: string; title: string; body: string; anchor?: string}) {
  return (
    <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={48} id={anchor}>
      <CatchText as="h2" id={id} variant="display-xl">{title}</CatchText>
      <CatchText tone="secondary" variant="body-lead">{body}</CatchText>
    </CatchStack>
  );
}

function Hero({captures}: {captures: CaptureSlots}) {
  const today = captureSlot(captures, "host-today", "eager");
  return (
    <CatchSurface aria-labelledby="host-hero-title" as="section" block="band" color="run">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={32}>
        <CatchStack gap={28}>
          <CatchText as="h1" id="host-hero-title" variant="display-hero">{copy.hero.title}</CatchText>
          <CatchText variant="body-lead">{copy.hero.body}</CatchText>
          <CatchStack direction="row" gap={12} wrap>
            <CatchButton href="#start" label={copy.hero.start} />
            <CatchButton href="#night" label={copy.hero.seeNight} variant="light" />
          </CatchStack>
          <HostStoreBadges placement="host_hero" />
          <CatchText variant="label-action">{copy.hero.terms}</CatchText>
        </CatchStack>
        {today ? <CatchAppCaptureImage {...today} bleed size="md" tilt="right" /> : null}
      </CatchStack>
    </CatchSurface>
  );
}

function Kinds({host}: {host: Host}) {
  return (
    <CatchSurface aria-labelledby="host-kinds-title" as="section" block="band" id="features">
      <HeadingRow anchor="use-cases" body={copy.kinds.body} id="host-kinds-title" title={copy.kinds.title} />
      <CatchScroller gap="related" itemWidth="m" label={copy.kinds.label}>
        {hostNightFormats.map((item, index) => (
          <CatchFormatTile body={item.tile} format={item.format} key={item.format} kicker={copy.kinds.kicker} onPressed={() => host.pickFormat(index, true)}
            photoUrl={item.photo ?? null} pressed={index === host.format} title={item.title} />
        ))}
      </CatchScroller>
      <CatchFormatMatrix
        formats={hostNightFormats.map((item) => ({format: item.format, title: item.title}))}
        heading={copy.matrix.heading}
        note={copy.matrix.note}
        onSelect={(index, source) => host.pickFormat(index, source === "table")}
        properties={copy.matrix.properties}
        selected={host.format}
        values={Object.fromEntries(hostNightFormats.map((item) => [item.format, item.properties]))}
      />
    </CatchSurface>
  );
}

function Night({captures, host}: {captures: CaptureSlots; host: Host}) {
  const night = host.night;
  const screens = nightScreens(captures);
  return (
    <CatchSurface aria-labelledby="host-night-title" as="section" block="band" color="ink" id="night">
      <CatchStack gap={16} id="how-it-works">
        <CatchText tone="warning" variant="label-kicker">{copy.night.kicker}</CatchText>
        <CatchText as="h2" id="host-night-title" variant="display-xl">{copy.night.title}</CatchText>
        <CatchText tone="secondary" variant="body-lead">{copy.night.lead}</CatchText>
      </CatchStack>
      <CatchNightScene
        formats={hostNightFormats.map((item) => ({format: item.format, title: item.title}))}
        frame="none"
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
              screen: screen ? <CatchAppCaptureImage {...screen} caption={undefined} /> : null,
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
    <CatchSurface aria-labelledby="host-tablet-title" as="section" block="band" color="tile">
      <CatchStack align="center" gap={20}>
        <CatchText align="center" tone="info" variant="label-kicker">{copy.tablet.kicker}</CatchText>
        <CatchText align="center" as="h2" id="host-tablet-title" variant="display-xl">{copy.tablet.title}</CatchText>
        <CatchText align="center" tone="secondary" variant="body-lead">{copy.tablet.body}</CatchText>
      </CatchStack>
      {tablet ? <CatchDeviceFrame bleed kind="tablet"><CatchAppCaptureImage {...tablet} caption={undefined} /></CatchDeviceFrame> : null}
    </CatchSurface>
  );
}

function Pipeline() {
  const pipeline = copy.pipeline;
  return (
    <CatchSurface aria-labelledby="host-pipeline-title" as="section" block="band">
      <HeadingRow body={pipeline.body} id="host-pipeline-title" title={pipeline.title} />
      <CatchPipelineBoard boardLabel={pipeline.boardLabel} guests={pipeline.guests} label={pipeline.label} replayLabel={pipeline.replay} steps={pipeline.steps} />
    </CatchSurface>
  );
}

function Guests({captures}: {captures: CaptureSlots}) {
  const guests = copy.guests;
  const explore = captureSlot(captures, "guest-explore");
  return (
    <CatchSurface aria-labelledby="host-guests-title" as="section" block="band" color="dinner">
      <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={64}>
        {explore ? <CatchAppCaptureImage {...explore} bleed size="sm" tilt="left" /> : null}
        <CatchStack gap={20}>
          <CatchText tone="primary" variant="label-kicker">{guests.kicker}</CatchText>
          <CatchText as="h2" id="host-guests-title" variant="display-xl">{guests.title}</CatchText>
          <CatchText variant="body-lead">{guests.body}</CatchText>
          <CatchSection dividers="none">
            {guests.items.map((item) => <CatchIndexRow density="regular" icon={item.icon} key={item.title} subtitle={item.body} title={item.title} wrap />)}
          </CatchSection>
          <CatchSurface block="spotlight" color="ink" padding="md">
            <CatchStack align="end" direction="row" gap={16} justify="between" wrap>
              <CatchStack gap={4}>
                <CatchText tone="secondary" variant="label-kicker">{guests.sees.kicker}</CatchText>
                <CatchText variant="display-lg">{guests.sees.title}</CatchText>
              </CatchStack>
              <CatchText tone="secondary" variant="body-small">{guests.sees.body}</CatchText>
            </CatchStack>
          </CatchSurface>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

function Growth({host}: {host: Host}) {
  const growth = copy.growth;
  const stats = host.linkStats;
  return (
    <CatchSurface aria-labelledby="host-growth-title" as="section" block="band">
      <HeadingRow body={growth.body} id="host-growth-title" title={growth.title} />
      <CatchStack align="stretch" collapseBelow="medium" direction="row" equal gap={24}>
        <CatchStack gap={12}>
          <CatchSection dividers="none" title={growth.pickLink}>
            {growth.links.map((item, index) => (
              <CatchIndexRow density="regular" icon="link" key={item.slug} onTap={() => host.setLink(index)} selected={index === host.link} subtitle={item.description} title={item.name} />
            ))}
          </CatchSection>
          <CatchStepList steps={growth.steps} />
        </CatchStack>
        <CatchSurface block="spotlight" color="ink" padding="lg">
          <CatchText variant="label-code">{host.linkUrl}</CatchText>
          <CatchMeter label={stats.visitsLabel} max={host.maxVisits} showLabel thickness={8} value={stats.visits} />
          <CatchMeter fill="format" format={stats.format} label={stats.bookingsLabel} max={host.maxVisits} showLabel thickness={8} value={stats.bookings} />
          <CatchStack direction="row" equal gap={12}>
            <CatchMetricTile label={growth.rate} layout="inline" value={stats.rate} />
            <CatchMetricTile label={growth.revenue} layout="inline" value={stats.revenue} />
            <CatchMetricTile label={growth.perVisit} layout="inline" value={stats.perVisit} />
          </CatchStack>
          <CatchText tone="secondary" variant="body-small">{growth.insight}</CatchText>
        </CatchSurface>
      </CatchStack>
      <CatchStack gap={8}>
        <CatchText variant="title-row">{growth.regularsTitle}</CatchText>
        <CatchText tone="secondary" variant="body">{growth.regularsBody}</CatchText>
        <CatchText tone="secondary" variant="body-meta">{growth.disclaimer}</CatchText>
      </CatchStack>
    </CatchSurface>
  );
}

function Layers({host}: {host: Host}) {
  const layers = copy.layers;
  return (
    <CatchSurface aria-labelledby="host-layers-title" as="section" block="band" color="indigo" id="ways">
      <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={48} id="existing-tools">
        <CatchText as="h2" id="host-layers-title" variant="display-xl">{layers.title}</CatchText>
        <CatchText variant="body-lead">{layers.body}</CatchText>
      </CatchStack>
      <CatchPageTabBar fill label={layers.label} onChanged={host.setLayer} options={layers.options} selected={host.layer} />
      <CatchStack gap={0} id="layers">
        <CatchLayerMap
          labels={{
            on: layers.map.on,
            off: layers.map.off,
            everyLayer: layers.map.everyLayer,
            fromLayer: (layer) => fill(layers.map.fromLayer, {layer}),
            newHere: layers.map.newHere,
            youKeep: (yours) => fill(layers.map.youKeep, {yours}),
          }}
          layer={host.layerIndex}
          nodes={layers.nodes}
        />
      </CatchStack>
      <CatchStack align="center" collapseBelow="medium" direction="row" gap={24} justify="between">
        <CatchText variant="title-bar">{host.layerBody}</CatchText>
        <CatchButton href="#pricing" label={layers.pricing} />
      </CatchStack>
    </CatchSurface>
  );
}

function Pricing({host}: {host: Host}) {
  const pricing = copy.pricing;
  return (
    <CatchSurface aria-labelledby="host-pricing-title" as="section" block="band" color="courts" id="pricing">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={16}>
          <CatchText variant="label-kicker">{pricing.kicker}</CatchText>
          <CatchText as="h2" id="host-pricing-title" numeric variant="display-giant">{pricing.rate}</CatchText>
          <CatchText variant="display-title">{pricing.title}</CatchText>
          <CatchText variant="body-lead">{pricing.body}</CatchText>
          <CatchStack align="start"><CatchButton href="#start" label={pricing.start} /></CatchStack>
        </CatchStack>
        <CatchSurface block="floating" padding="lg">
          <CatchText tone="secondary" variant="label-action">{pricing.sales}</CatchText>
          <CatchText aria-live="polite" numeric variant="display-lg">{host.salesText}</CatchText>
          <CatchRangeInput label={pricing.sales} max={salesRange.max} min={salesRange.min} onChange={(value) => host.setSales(Array.isArray(value) ? value[1] : (value as number))}
            step={salesRange.step} value={host.sales} />
          <CatchStack direction="row" justify="between">
            <CatchText tone="secondary" variant="body-meta">{pricing.min}</CatchText>
            <CatchText tone="secondary" variant="body-meta">{pricing.max}</CatchText>
          </CatchStack>
          <CatchStack direction="row" equal gap={12}>
            <CatchMetricTile label={pricing.fee} note={pricing.feeNote} value={host.feeText} />
            <CatchMetricTile label={pricing.effective} note={pricing.effectiveNote} value={host.rateText} />
          </CatchStack>
          <CatchMeter kind="cap" label={pricing.capLabel} max={feeCap} thickness={8} value={host.fee} />
          <CatchText tone={host.capped ? "success" : "secondary"} variant="label-action">{host.capped ? pricing.capped : pricing.uncapped}</CatchText>
          <CatchText variant="body-small">{pricing.trial}</CatchText>
          <CatchText tone="secondary" variant="body-meta">{pricing.gateway}</CatchText>
        </CatchSurface>
      </CatchStack>
    </CatchSurface>
  );
}

function Faq() {
  return (
    <CatchSurface aria-labelledby="host-faq-title" as="section" block="band" id="faq">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchText as="h2" id="host-faq-title" variant="display-xl">{copy.faq.title}</CatchText>
        <CatchAccordion exclusive items={copy.faq.items} name="host-faq" size="lg" />
      </CatchStack>
    </CatchSurface>
  );
}

function Start() {
  const start = copy.start;
  return (
    <CatchSurface aria-labelledby="host-start-title" as="section" block="band" color="games" id="start">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48} id="apply">
        <CatchStack gap={24}>
          <CatchText variant="label-kicker">{start.kicker}</CatchText>
          <CatchText as="h2" id="host-start-title" variant="display-xl">{start.title}</CatchText>
          <CatchText variant="body-lead">{start.body}</CatchText>
        </CatchStack>
        <CatchStack gap={24}>
          <CatchStepList steps={start.steps} />
          <HostStoreBadges placement="host_start" />
          <CatchStack align="center" direction="row" gap={8} wrap>
            <CatchText variant="body-small">{start.weddingsLead}</CatchText>
            <CatchButton href={start.weddingsHref} label={start.weddings} size="sm" trailingIcon="forward" variant="quiet" />
          </CatchStack>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The host landing, band for band as the RbWebHostV2 board: the hero, every
 * kind of night with the format matrix, the night scene, the tablet, the
 * booking board, guests, growth links, the ways to use Catch, pricing, the
 * FAQ and the free-trial start. The legacy route anchors (#features,
 * #use-cases, #how-it-works, #existing-tools, #layers, #apply) sit on the
 * bands that now carry that content, so retired links still land.
 */
function HostLandingBands({captures, host}: {captures: CaptureSlots; host: Host}) {
  return (
    <>
      <Hero captures={captures} />
      <Kinds host={host} />
      <Night captures={captures} host={host} />
      <Tablet captures={captures} />
      <Pipeline />
      <Guests captures={captures} />
      <Growth host={host} />
      <Layers host={host} />
      <Pricing host={host} />
      <Faq />
      <Start />
    </>
  );
}

/**
 * The host landing (the RbWebHostV2 board) on the white ground: the site
 * header naming the product and its sections with Start free trial, the
 * board's bands, and the short footer. `captures` are the marketing capture
 * slots (src/app/marketingCaptures.ts).
 */
export function HostPage({captures}: {captures: CaptureSlots}) {
  const host = useHostLandingController();
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader actions={<CatchButton href="#start" label={copy.header.start} size="sm" />} links={copy.header.nav} title={copy.header.title} />
      <WebsitePageMain id="top">
        <HostLandingBands captures={captures} host={host} />
      </WebsitePageMain>
      <PublicSiteFooter tagline={copy.footer.tagline} />
    </CatchRoot>
  );
}
