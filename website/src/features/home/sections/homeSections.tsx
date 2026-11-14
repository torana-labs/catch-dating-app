import {
  CatchAccordion,
  CatchAppCaptureImage,
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchDeviceFrame,
  CatchEventCard,
  CatchField,
  CatchFormatTile,
  CatchHeroShowcase,
  CatchIndexRow,
  CatchMenu,
  CatchOrganizerCard,
  CatchQrCode,
  CatchRail,
  CatchScroller,
  CatchSection,
  CatchStack,
  CatchStoreButton,
  CatchSurface,
  CatchText,
  catchFormatAccentOf,
  type CatchHeroShowcaseSticker,
  type CatchTextTone,
} from "@catch/web-ui";
import {useEffect, useState, type ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {captureSlot, type CaptureSlots} from "../../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../../shared/site";
import {Form} from "../../../shared/ui/primitives";
import {useAppDownloadCtas} from "../../marketing/useAppDownloadCtas";
import {CityPicker} from "./CityPicker";
import type {HomeFilter, HomePageController} from "../useHomePageController";
import {useLaunchNoticeController} from "../useLaunchNoticeController";
import {cityPagePath, footerCities} from "./cityChrome";

type Home = HomePageController;
const filterValues: HomeFilter[] = ["all", ...homeFormats.map((item) => item.format)];
const areasOf = (home: Home) => homeCityAreas[home.city.marketSlug];
const posterOf = (format: string | null) => homeFormats.find((item) => item.format === format)?.poster;

/** A section opening: a coloured kicker over a display headline. */
function Heading({id, kicker, title, tone = "secondary", as = "h2"}: {id?: string; kicker: string; title: string; tone?: CatchTextTone; as?: "h1" | "h2"}) {
  return (
    <CatchStack gap={8}>
      <CatchText tone={tone} variant="label-kicker">{kicker}</CatchText>
      <CatchText as={as} id={id} variant="display-xl">{title}</CatchText>
    </CatchStack>
  );
}

/** A heading with its lead or action across from it on a wide page. */
function HeadingRow({children, aside}: {children: ReactNode; aside: ReactNode}) {
  return <CatchStack align="end" collapseBelow="medium" direction="row" gap={32} justify="between">{children}{aside}</CatchStack>;
}

/** The Catch app's official store badges for one placement. */
function StoreButtons({placement, size = "l"}: {placement: string; size?: "m" | "l"}) {
  const stores = useAppDownloadCtas({placement});
  return (
    <CatchStack align="center" direction="row" gap={12} wrap>
      {stores.map((store) => (
        <CatchStoreButton badgeSrc={store.badgeSrc} comingSoon={store.comingSoon} href={store.href || undefined} key={store.store} label={store.accessibleLabel} onClick={store.onClick} size={size} store={store.store} />
      ))}
    </CatchStack>
  );
}

// The hero's stickers sit on white, ink and yellow, as the board sets them.
const stickerGrounds = ["white", "ink", "yellow"] as const;

function HomeHero({captures, home}: {captures: CaptureSlots; home: Home}) {
  const city = home.city.label;
  const explore = captureSlot(captures, "guest-explore", "eager");
  const stickers: CatchHeroShowcaseSticker[] = home.stickers.map((plan, index) => {
    const ground = stickerGrounds[index % stickerGrounds.length];
    const accent = plan.format ? catchFormatAccentOf(plan.format) : null;
    return {
      label: fill(copy.hero.chipKicker, {format: posterOf(plan.format) ?? plan.formatLabel, when: plan.when}),
      title: plan.title,
      ground,
      labelAccent: ground === "yellow" || !accent ? undefined : accent,
    };
  });
  return (
    <CatchSurface aria-labelledby="home-title" as="section" block="band">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText tone="danger" variant="label-kicker">{fill(home.live ? copy.hero.liveEyebrow : copy.hero.soonEyebrow, {city})}</CatchText>
          <CatchText as="h1" id="home-title" variant="display-hero">{copy.hero.title}</CatchText>
          <CatchText tone="secondary" variant="body-lead">{copy.hero.body}</CatchText>
          <CatchStack direction="row" gap={8} wrap>
            <CatchButton href="#whats-on" label={fill(home.live ? copy.hero.liveAction : copy.hero.soonAction, {city})} />
            <CatchButton href="/host/" label={copy.hero.hostAction} variant="secondary" />
          </CatchStack>
          <StoreButtons placement="home_hero" />
        </CatchStack>
        <CatchHeroShowcase
          device={explore ? <CatchAppCaptureImage {...explore} caption={undefined} tilt="left" /> : null}
          ground="pink"
          stickers={stickers}
        />
      </CatchStack>
    </CatchSurface>
  );
}

function HomeFormats({home}: {home: Home}) {
  return (
    <CatchSurface aria-labelledby="home-formats-title" as="section" block="band">
      <HeadingRow aside={<CatchText tone="secondary" variant="body">{copy.formats.lead}</CatchText>}>
        <Heading id="home-formats-title" kicker={copy.formats.eyebrow} title={copy.formats.title} tone="success" />
      </HeadingRow>
      {/* The band already pads to the content edge, so the rail's first tile lines up with the heading. */}
      <CatchScroller edge="none" gap="related" itemWidth="m" label={copy.formats.label}>
        {home.tiles.map((tile) => home.live ? (
          <CatchFormatTile body={tile.body} format={tile.format} key={tile.format} kicker={tile.kicker} onPressed={() => {
            home.chooseTile(tile.format);
            if (typeof document !== "undefined") document.getElementById("whats-on")?.scrollIntoView?.({behavior: "smooth", block: "start"});
          }} photoUrl={tile.photoUrl} pressed={home.filter === tile.format} title={tile.title} />
        ) : (
          <CatchFormatTile body={tile.body} format={tile.format} href="#whats-on" key={tile.format} kicker={tile.kicker} photoUrl={tile.photoUrl} title={tile.title} />
        ))}
      </CatchScroller>
    </CatchSurface>
  );
}

function HomeThisWeek({home}: {home: Home}) {
  const city = home.city.label;
  const areas = areasOf(home);
  return (
    <CatchSurface aria-labelledby="home-week-title" as="section" block="band" color="tile" id="whats-on">
      <HeadingRow aside={<CatchButton href={home.exploreHref} label={fill(copy.week.action, {city})} />}>
        <CatchStack gap={8}>
          <CatchText tone="danger" variant="label-kicker">{home.weekCount > 1 ? fill(copy.week.eyebrow, {count: home.weekCount}) :
            home.weekCount ? copy.week.eyebrowOne : fill(copy.week.eyebrowNew, {city})}</CatchText>
          <CatchText as="h2" id="home-week-title" variant="display-xl">{fill(copy.week.title, {city})}</CatchText>
          <CatchText tone="secondary" variant="body">{areas ? fill(copy.week.lead, {areas}) : fill(copy.week.leadNoAreas, {city})}</CatchText>
        </CatchStack>
      </HeadingRow>
      <CatchStack aria-label={copy.week.filters} direction="row" gap={8} role="radiogroup" wrap>
          {filterValues.map((value) => (
            <CatchChip colourWhenSelected dot={value === "all" || value === "other" ? undefined : value} key={value} kind="choice"
              label={value === "all" ? copy.week.everything : homeFormats.find((item) => item.format === value)?.name ?? value}
              onPressed={() => home.setFilter(value)} selected={home.filter === value} />
          ))}
        </CatchStack>
      {home.plans.length ? (
        <CatchRail itemWidth={240} label={fill(copy.week.title, {city})} wrap="auto">
          {home.plans.map((plan) => (
            <CatchEventCard format={plan.format ?? "games"} formatLabel={plan.formatLabel || undefined} href={plan.href} imageUrl={plan.photoUrl ?? undefined} key={plan.key}
              place={plan.detail} price={plan.availability ? `${plan.price} · ${plan.availability}` : plan.price} title={plan.title} variant="compact" when={plan.when} />
          ))}
        </CatchRail>
      ) : null}
      <CatchText aria-live="polite" as="p" tone="secondary" variant="body-small">{home.note}</CatchText>
    </CatchSurface>
  );
}

/** "Tell me when it opens": one WhatsApp message on opening day, news only if ticked. */
function HomeLaunchNotice({home}: {home: Home}) {
  const city = home.city.label;
  const notice = useLaunchNoticeController(city, undefined, {slug: home.city.slug, source: home.citySource});
  return (
    <CatchStack gap={12}>
      <CatchText as="h3" variant="display-sm">{copy.notice.title}</CatchText>
      <CatchText tone="secondary" variant="body">{fill(copy.notice.lead, {city})}</CatchText>
      {notice.joined ? null : (
        <Form noValidate onSubmit={notice.handleSubmit} pending={notice.sending}>
          <CatchStack gap={12}>
            <CatchField autoComplete="tel-national" errorText={notice.status.tone === "is-error" ? notice.status.message : null} inputHint={copy.notice.phoneHint}
              inputMode={notice.sending ? "inactive" : "editable"} keyboardType="phone" labelMode="hidden" onChanged={notice.setPhone} prefixText={activeMarket.dialCode}
              recipe="input" required title={copy.notice.phone} value={notice.phone} />
            <CatchCheckboxInput label={fill(copy.notice.marketing, {city})} onChanged={notice.sending ? null : notice.setMarketing} value={notice.marketing} />
            <CatchButton fill label={copy.notice.action} onPressed={() => undefined} status={notice.sending ? "loading" : "idle"} type="submit" />
            <CatchText tone="secondary" variant="body-small">{copy.notice.consent}</CatchText>
            <CatchStack align="start"><CatchButton href="/privacy/" label={copy.notice.privacy} size="sm" variant="quiet" /></CatchStack>
          </CatchStack>
        </Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{notice.status.tone === "is-success" ? notice.status.message : ""}</CatchText>
    </CatchStack>
  );
}

/** A city that has not opened: what is coming, who is joining, the notice and the busiest live city. */
function HomeLaunchingSoon({home}: {home: Home}) {
  const city = home.city.label;
  const areas = areasOf(home);
  return (
    <CatchSurface aria-labelledby="home-soon-title" as="section" block="band" color="tile" id="whats-on">
      <CatchStack gap={8}>
        <Heading id="home-soon-title" kicker={copy.soon.eyebrow} title={fill(copy.soon.title, {city})} tone="info" />
        <CatchText tone="secondary" variant="body-lead">{areas ? fill(copy.soon.lead, {areas}) : fill(copy.soon.leadNoAreas, {city})}</CatchText>
      </CatchStack>
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={24}>
        <CatchSurface block="floating">
          <CatchText tone="secondary" variant="label-kicker">{copy.soon.comingLabel}</CatchText>
          <CatchText variant="display-sm">{home.coming}</CatchText>
          {home.organizers.length ? (
            <CatchSection kicker={copy.soon.joiningLabel}>
              {home.organizers.map((organizer) => <CatchIndexRow density="regular" key={organizer.key} subtitle={organizer.subtitle} title={organizer.name} />)}
            </CatchSection>
          ) : null}
        </CatchSurface>
        <CatchSurface block="floating">
          <HomeLaunchNotice home={home} />
          <CatchStack gap={4}>
            <CatchText as="h3" variant="title-row">{fill(copy.soon.knowHost, {city})}</CatchText>
            <CatchStack align="start"><CatchButton href="/host/" label={copy.soon.knowHostAction} size="sm" variant="quiet" /></CatchStack>
          </CatchStack>
          <CatchStack gap={8}>
            <CatchText as="h3" variant="title-row">{copy.soon.appTitle}</CatchText>
            <StoreButtons placement="home_launching_soon" size="m" />
          </CatchStack>
        </CatchSurface>
      </CatchStack>
      {home.liveCity ? (
        <CatchSurface block="floating" padding="md">
          <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
            <CatchText variant="body"><CatchText as="strong" variant="title-row">{fill(copy.soon.liveCityNote, {city: home.liveCity.label})}</CatchText>{" "}
              {fill(copy.soon.liveCityCount, {count: home.liveCity.weekPlanCount})}</CatchText>
            <CatchButton href={home.cityHref(home.liveCity.slug)} label={fill(copy.soon.liveCityAction, {city: home.liveCity.label})} size="md" variant="secondary" />
          </CatchStack>
        </CatchSurface>
      ) : null}
    </CatchSurface>
  );
}

/** How long each step of the guest story shows before the next, until the reader picks one. */
const storyStepMs = 4_000;

/** The guest story's step: it moves on by itself until the reader picks one, and holds still under reduced motion. */
function useStoryStep(count: number) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!auto || reduced) return undefined;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % count), storyStepMs);
    return () => window.clearInterval(timer);
  }, [auto, count]);
  return {step, pick: (index: number) => { setStep(index); setAuto(false); }};
}

function HomeNight({captures}: {captures: CaptureSlots}) {
  // One screen per story step; a step without a capture keeps the screen before it.
  const screens = [captureSlot(captures, "guest-explore"), captureSlot(captures, "guest-checked-in"),
    captureSlot(captures, "guest-after-event")];
  const story = useStoryStep(copy.story.steps.length);
  const screen = screens.slice(0, story.step + 1).reverse().find(Boolean) ?? null;
  return (
    <CatchSurface aria-labelledby="home-story-title" as="section" block="band" color="ink" id="how">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <Heading id="home-story-title" kicker={copy.story.eyebrow} title={copy.story.title} tone="danger" />
          <CatchText tone="secondary" variant="body-lead">{copy.story.lead}</CatchText>
          <CatchSection dividers="none">
            {copy.story.steps.map((step, index) => (
              <CatchIndexRow density="regular" key={step.title} onTap={() => story.pick(index)} rank={index + 1} selected={index === story.step}
                subtitle={step.body} title={step.title} wrap />
            ))}
          </CatchSection>
        </CatchStack>
        {screen ? <CatchAppCaptureImage {...screen} caption={undefined} size="md" tilt="right" /> : null}
      </CatchStack>
    </CatchSurface>
  );
}

function HomeOrganisers({home}: {home: Home}) {
  const city = home.city.label;
  const title = home.live ? copy.organisers.liveTitle : copy.organisers.soonTitle;
  return (
    <CatchSurface aria-labelledby="home-organisers-title" as="section" block="band" id="organisers">
      <HeadingRow aside={<CatchText tone="secondary" variant="body">{copy.organisers.lead}</CatchText>}>
        <Heading id="home-organisers-title" kicker={home.live ? copy.organisers.liveEyebrow : fill(copy.organisers.soonEyebrow, {city})} title={title} tone="danger" />
      </HeadingRow>
      {home.organizers.length ? (
        <CatchRail itemWidth={340} label={title} wrap="always">
          {home.organizers.map((organizer) => (
            <CatchOrganizerCard color={organizer.color} href={organizer.action.kind === "none" ? undefined : organizer.action.href} initials={organizer.initials}
              key={organizer.key} meta={organizer.meta} name={organizer.name} />
          ))}
        </CatchRail>
      ) : null}
      <CatchSurface block="spotlight" color="courts">
        <CatchStack align="center" collapseBelow="medium" direction="row" gap={16} justify="between">
          <CatchStack gap={4}>
            <CatchText as="h3" variant="display-sm">{fill(copy.organisers.claimBand, {city})}</CatchText>
            <CatchText variant="body">{copy.organisers.claimBandBody}</CatchText>
          </CatchStack>
          <CatchButton href="/claim/" label={copy.organisers.claimBandAction} />
        </CatchStack>
      </CatchSurface>
    </CatchSurface>
  );
}

function HomeHosts({captures}: {captures: CaptureSlots}) {
  const tablet = captureSlot(captures, "host-live-tablet");
  return (
    <CatchSurface aria-labelledby="home-host-title" as="section" block="band" color="run" id="hosts">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <Heading id="home-host-title" kicker={copy.host.eyebrow} title={copy.host.title} tone="primary" />
          <CatchText variant="body-lead">{copy.host.body}</CatchText>
          <CatchSurface>
            <CatchText variant="title-row">{copy.host.price}</CatchText>
            <CatchText variant="body-small">{copy.host.priceNote}</CatchText>
          </CatchSurface>
          <CatchStack direction="row" gap={8} wrap>
            <CatchButton href="/host/#start" label={copy.host.trial} />
            <CatchButton href="/host/" label={copy.host.action} variant="secondary" />
            <CatchButton href="/claim/" label={copy.host.claim} variant="ghost" />
          </CatchStack>
        </CatchStack>
        {tablet ? <CatchDeviceFrame kind="tablet" tilt="left"><CatchAppCaptureImage {...tablet} caption={undefined} /></CatchDeviceFrame> : null}
      </CatchStack>
    </CatchSurface>
  );
}

/** The QR code appears once there is one download link for both stores (CAT-204). */
function HomeApp({downloadUrl}: {downloadUrl?: string}) {
  return (
    <CatchSurface aria-labelledby="home-app-title" as="section" block="band" id="app">
      <CatchSurface block="spotlight" color="dinner">
        <CatchStack align="center" collapseBelow="medium" direction="row" gap={32} justify="between">
          <CatchStack gap={16}>
            <CatchText variant="label-kicker">{copy.app.eyebrow}</CatchText>
            <CatchText as="h2" id="home-app-title" variant="display-lg">{copy.app.title}</CatchText>
            <CatchText variant="body-lead">{copy.app.body}</CatchText>
            <StoreButtons placement="home_app_band" />
          </CatchStack>
          {downloadUrl ? (
            <CatchSurface block="floating">
              <CatchQrCode label={copy.app.qrLabel} value={downloadUrl} />
              <CatchText variant="label-action">{copy.app.qr}</CatchText>
            </CatchSurface>
          ) : null}
        </CatchStack>
      </CatchSurface>
    </CatchSurface>
  );
}

function HomeFaq() {
  return (
    <CatchSurface aria-labelledby="home-faq-title" as="section" block="band" id="faq">
      <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={48}>
        <Heading id="home-faq-title" kicker={copy.faq.eyebrow} title={copy.faq.title} />
        <CatchAccordion items={copy.faq.items.map((item) => ({title: item.question, body: item.answer}))} name="home-faq" size="lg" />
      </CatchStack>
    </CatchSurface>
  );
}

/** The one site footer, with the homepage's cities (each city's status as the picker reads it). */
function HomeFooter({home}: {home: Home}) {
  return (
    <PublicSiteFooter appHref="#app" exploreHref={home.exploreHref}
      cities={footerCities(home.cities)} />
  );
}

/**
 * The homepage, band for band as the RbWebHomeV2 board: the site header with
 * the city picker, the hero, formats, this week (or launching soon), how a
 * night works, organisers, the host band, the app band, the FAQ and the
 * footer. It arranges system components and binds the controller's view of
 * the city to them.
 */
export function HomePageSections({captures, downloadUrl, home}: {captures: CaptureSlots; home: Home; downloadUrl?: string}) {
  return (
    <>
      <PublicSiteHeader
        actions={<><CityPicker cities={home.cities} onChoose={home.chooseCity} selected={home.city} /><CatchButton href="#app" label={copy.header.app} size="sm" /></>}
        links={[{href: "#whats-on", label: copy.header.explore}, {href: "#organisers", label: copy.header.organisers}, {href: "/host/", label: copy.header.hosts}]}
      />
      <WebsitePageMain id="top">
        <HomeHero captures={captures} home={home} />
        <HomeFormats home={home} />
        {home.live ? <HomeThisWeek home={home} /> : <HomeLaunchingSoon home={home} />}
        <HomeNight captures={captures} />
        <HomeOrganisers home={home} />
        <HomeHosts captures={captures} />
        <HomeApp downloadUrl={downloadUrl} />
        <HomeFaq />
      </WebsitePageMain>
      <HomeFooter home={home} />
    </>
  );
}
