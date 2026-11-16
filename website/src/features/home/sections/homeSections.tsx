import {
  CatchAppCaptureImage,
  CatchBadge,
  CatchButton,
  CatchCardGrid,
  CatchCheckboxInput,
  CatchChip,
  CatchCtaSection,
  CatchDeviceFrame,
  CatchFaqSection,
  CatchField,
  CatchHeroSection,
  CatchQrCode,
  CatchReviewItem,
  CatchSplitSection,
  CatchStack,
  CatchText,
  type CatchBandAction,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {guestAppLive, whatsappChatCopy, whatsappChatHref} from "@content/site";
import {captureSlot, type CaptureSlots} from "../../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../../shared/site";
import {Form} from "../../../shared/ui/primitives";
import {useAppDownloadCtas} from "../../marketing/useAppDownloadCtas";
import {useFoundingHostOffer} from "../../playbook/useFoundingHostOffer";
import {CityPicker} from "./CityPicker";
import type {HomeFilter, HomePageController} from "../useHomePageController";
import {useAppNoticeController} from "../useAppNoticeController";
import {useLaunchNoticeController} from "../useLaunchNoticeController";
import {footerCities} from "./cityChrome";

type Home = HomePageController;
const filterValues: HomeFilter[] = ["all", ...homeFormats.map((item) => item.format)];

/**
 * The opening band. An open city leads with guests: the headline, the way to
 * its plans and the host link in the phone's first screen, with the soonest
 * plan floating over the app. A city that has not opened leads with hosts.
 */
function HomeHero({captures, home, offerOpen}: {captures: CaptureSlots; home: Home; offerOpen: boolean}) {
  const city = home.city.label;
  if (home.state === "launching") {
    const tablet = captureSlot(captures, "host-live-tablet", "eager");
    return (
      <CatchHeroSection
        actions={[{label: copy.launchHero.startAction, href: "/host/#start"}, {label: copy.launchHero.hostsAction, href: "/host/"}]}
        ground="indigo"
        id="home-hero"
        kicker={home.heroEyebrow}
        lead={offerOpen ? copy.launchHero.foundingBody : copy.launchHero.body}
        link={home.liveCity ? {label: fill(copy.soon.liveCityAction, {city: home.liveCity.label}), href: home.cityHref(home.liveCity.slug)} : undefined}
        media={tablet ? <CatchDeviceFrame kind="tablet" tilt="left"><CatchAppCaptureImage {...tablet} caption={undefined} /></CatchDeviceFrame> : undefined}
        title={fill(copy.launchHero.title, {city})}
      />
    );
  }
  const explore = captureSlot(captures, "guest-explore", "eager");
  const plan = home.heroPlan;
  return (
    <CatchHeroSection
      actions={[
        {label: home.state === "thin" ? copy.hero.thinAction : fill(copy.hero.busyAction, {city}), href: "#whats-on"},
        {label: copy.hero.hostAction, href: "/host/"},
      ]}
      aside={plan ? {title: plan.title, rows: [{label: plan.when, value: plan.availability ?? plan.price}]} : undefined}
      ground="pink"
      id="home-hero"
      kicker={home.heroEyebrow}
      lead={copy.hero.body}
      // Before the app is on a store, no "Coming soon" badges that capture nothing (leak 2): a quiet link down to the notice.
      link={guestAppLive ? undefined : {label: copy.app.heroLink, href: "#app"}}
      media={explore ? <CatchAppCaptureImage {...explore} caption={undefined} tilt="left" /> : undefined}
      title={copy.hero.title}
    />
  );
}

/** The format chips of a busy city, and the line that says what is shown. */
function PlanFilters({home}: {home: Home}) {
  const note = home.plans.length ? <CatchText aria-live="polite" as="p" tone="secondary" variant="body-small">{home.note}</CatchText> : null;
  if (home.state !== "busy" || home.unavailable) return note;
  return (
    <CatchStack gap={12}>
      <CatchStack aria-label={copy.week.filters} direction="row" gap={8} role="radiogroup" wrap>
        {filterValues.map((value) => (
          <CatchChip colourWhenSelected dot={value === "all" || value === "other" ? undefined : value} key={value} kind="choice"
            label={value === "all" ? copy.week.everything : homeFormats.find((item) => item.format === value)?.name ?? value}
            onPressed={() => home.setFilter(value)} selected={home.filter === value} />
        ))}
      </CatchStack>
      {note}
    </CatchStack>
  );
}

/**
 * An open city's plans: this week, or the next two weeks when the week is
 * quiet or the city is thin, never an empty band. The other open cities sit
 * under the heading, so a visitor can switch city from here.
 */
function HomePlans({home}: {home: Home}) {
  const city = home.city.label;
  const areas = homeCityAreas[home.city.marketSlug];
  const thin = home.state === "thin";
  return (
    <CatchCardGrid
      actions={[{label: thin ? copy.week.thinAction : fill(copy.week.action, {city}), href: home.exploreHref}]}
      empty={{title: home.note}}
      filters={<PlanFilters home={home} />}
      ground="paper"
      id="whats-on"
      items={home.plans.map((plan) => ({
        id: plan.key, href: plan.href, title: plan.title, label: plan.label, format: plan.format, detail: plan.detail,
        price: plan.price, availability: plan.availability, photoUrl: plan.photoUrl, posterLabel: plan.posterLabel,
      }))}
      // A city that could not be read carries no count and is never called new.
      kicker={home.unavailable ? undefined : home.upcoming ? copy.week.upcomingEyebrow : home.weekCount > 1 ? fill(copy.week.eyebrow, {count: home.weekCount}) :
        home.weekCount ? copy.week.eyebrowOne : fill(copy.week.eyebrowNew, {city})}
      kind="plan"
      lead={thin ? fill(copy.week.thinLead, {city}) : areas ? fill(copy.week.lead, {areas}) : fill(copy.week.leadNoAreas, {city})}
      links={home.otherCities}
      title={fill(home.upcoming ? copy.week.upcomingTitle : copy.week.title, {city})}
    />
  );
}

/** "Here for the plans?": one WhatsApp message on opening day, news only if ticked. */
function LaunchNoticeForm({home}: {home: Home}) {
  const city = home.city.label;
  const notice = useLaunchNoticeController(city, undefined, {slug: home.city.slug, source: home.citySource});
  return (
    <CatchStack gap={12}>
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

/** A city that has not opened: what is coming, and the opening-day notice in place of plans. */
function HomeLaunchingSoon({home}: {home: Home}) {
  return (
    <CatchCtaSection
      capture={<LaunchNoticeForm home={home} />}
      ground="paper"
      id="whats-on"
      kicker={copy.soon.eyebrow}
      lead={fill(copy.soon.lead, {coming: home.coming, city: home.city.label})}
      title={copy.soon.title}
    />
  );
}

/**
 * The host band: in a busy city it follows the proof; in a thin or launching
 * city it moves up to third place, with the founding-host offer while the
 * city's counter reads open. A launching city's hero already shows the
 * tablet, so the band keeps to its words there.
 */
function HomeHosts({captures, home, offerOpen}: {captures: CaptureSlots; home: Home; offerOpen: boolean}) {
  const early = home.state !== "busy";
  const tablet = captureSlot(captures, "host-live-tablet");
  const media = home.state !== "launching" && tablet ?
    <CatchDeviceFrame kind="tablet" tilt="left"><CatchAppCaptureImage {...tablet} caption={undefined} /></CatchDeviceFrame> : undefined;
  const actions: CatchBandAction[] = early ?
    [{label: copy.host.trial, href: "/host/#start"}, {label: copy.host.whatsapp, href: whatsappChatHref(whatsappChatCopy.hostQuestionMessage), newTab: true}] :
    [{label: copy.host.trial, href: "/host/#start"}, {label: copy.host.action, href: "/host/"}];
  return (
    <CatchSplitSection
      actions={actions}
      body={early && offerOpen ? fill(copy.host.foundingBody, {city: home.city.label}) : copy.host.fees}
      flush={media != null}
      ground="indigo"
      id="hosts"
      kicker={copy.host.eyebrow}
      lead={copy.host.body}
      media={media}
      title={copy.host.title}
    />
  );
}

/** How a night works: three steps beside the checked-in screen. */
function HomeNight({captures}: {captures: CaptureSlots}) {
  const checkedIn = captureSlot(captures, "guest-checked-in");
  return (
    <CatchSplitSection
      flush={checkedIn != null}
      ground="ink"
      id="how"
      kicker={copy.story.eyebrow}
      lead={copy.story.lead}
      media={checkedIn ? <CatchAppCaptureImage {...checkedIn} caption={undefined} size="md" tilt="right" /> : undefined}
      steps={copy.story.steps}
      title={copy.story.title}
    />
  );
}

/** Proof: what is in place, and a real review only when a guest who booked has written one. */
function HomeProof({home}: {home: Home}) {
  const review = home.review;
  return (
    <CatchSplitSection
      align="start"
      checks={copy.safety.checks}
      id="safety"
      kicker={copy.safety.eyebrow}
      lead={copy.safety.lead}
      media={review ? (
        <CatchReviewItem badge={<CatchBadge label={copy.safety.verified} size="sm" tone="success" />} body={review.comment} meta={review.eventTitle}
          name={review.reviewerName} rating={review.rating} ratingLabel={fill(copy.safety.rating, {rating: review.rating})} variant="card" />
      ) : undefined}
      title={copy.safety.title}
    />
  );
}

function HomeOrganisers({home}: {home: Home}) {
  const city = home.city.label;
  return (
    <CatchCardGrid
      actions={[{label: copy.organisers.claimBandAction, href: "/claim/", variant: "secondary"}]}
      columns={4}
      id="organisers"
      items={home.organizers.map((organizer) => ({
        id: organizer.key, name: organizer.name, initials: organizer.initials, color: organizer.color, meta: organizer.meta,
        href: organizer.action.kind === "none" ? undefined : organizer.action.href,
      }))}
      kicker={fill(home.live ? copy.organisers.liveEyebrow : copy.organisers.soonEyebrow, {city})}
      kind="org"
      lead={copy.organisers.lead}
      title={home.live ? copy.organisers.liveTitle : copy.organisers.soonTitle}
    />
  );
}

/** "Get notified": one WhatsApp message when the app launches, new plans only if ticked. */
function AppNoticeForm({home}: {home: Home}) {
  const city = home.city.label;
  const notice = useAppNoticeController(city, undefined, {slug: home.city.slug, source: home.citySource});
  const notify = copy.app.notify;
  return (
    <CatchStack gap={12}>
      {notice.joined ? null : (
        <Form noValidate onSubmit={notice.handleSubmit} pending={notice.sending}>
          <CatchStack gap={12}>
            <CatchField autoComplete="tel-national" errorText={notice.status.tone === "is-error" ? notice.status.message : null} inputHint={notify.phoneHint}
              inputMode={notice.sending ? "inactive" : "editable"} keyboardType="phone" labelMode="hidden" onChanged={notice.setPhone} prefixText={activeMarket.dialCode}
              recipe="input" required title={notify.phone} value={notice.phone} />
            <CatchCheckboxInput label={fill(notify.newPlans, {city})} onChanged={notice.sending ? null : notice.setNewPlans} value={notice.newPlans} />
            <CatchButton fill label={notify.action} onPressed={() => undefined} status={notice.sending ? "loading" : "idle"} type="submit" />
            <CatchText tone="secondary" variant="body-small">{notify.consent}</CatchText>
            <CatchStack align="start"><CatchButton href="/privacy/" label={notify.privacy} size="sm" variant="quiet" /></CatchStack>
          </CatchStack>
        </Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{notice.status.tone === "is-success" ? notice.status.message : ""}</CatchText>
    </CatchStack>
  );
}

/** Once the app is on a store: its badges, and the QR code when there is one download link (CAT-204). */
function HomeAppLive({downloadUrl, media}: {downloadUrl?: string; media: ReactNode}) {
  const stores = useAppDownloadCtas({placement: "home_app_band"});
  return (
    <CatchCtaSection
      capture={downloadUrl ? (
        <CatchStack align="start" gap={8}>
          <CatchQrCode label={copy.app.qrLabel} value={downloadUrl} />
          <CatchText variant="label-action">{copy.app.qr}</CatchText>
        </CatchStack>
      ) : undefined}
      ground="paper"
      id="app"
      kicker={copy.app.eyebrow}
      lead={copy.app.body}
      media={media}
      stores={stores.map((store) => ({badgeSrc: store.badgeSrc, comingSoon: store.comingSoon, href: store.href || undefined, label: store.accessibleLabel,
        onClick: store.onClick, size: "l", store: store.store}))}
      title={copy.app.title}
    />
  );
}

/** The notify capture: until the app is on a store, the WhatsApp notice for its launch (keeps "Get notified"). */
function HomeApp({captures, downloadUrl, home}: {captures: CaptureSlots; downloadUrl?: string; home: Home}) {
  const after = captureSlot(captures, "guest-after-event");
  const media = after ? <CatchAppCaptureImage {...after} caption={undefined} size="md" tilt="right" /> : undefined;
  if (guestAppLive) return <HomeAppLive downloadUrl={downloadUrl} media={media} />;
  return (
    <CatchCtaSection capture={<AppNoticeForm home={home} />} ground="paper" id="app" kicker={copy.app.soonEyebrow} media={media} title={copy.app.soonTitle} />
  );
}

function HomeFaq() {
  return (
    <CatchFaqSection
      id="faq"
      items={copy.faq.items.map((item) => ({id: item.id, question: item.question, answer: guestAppLive && "liveAnswer" in item ? item.liveAnswer : item.answer}))}
      kicker={copy.faq.eyebrow}
      title={copy.faq.title}
    />
  );
}

/**
 * The homepage, band for band as the playbook's homepage board, in the
 * city's state: the site header with the city picker, the hero, the plans
 * (or the launch notice), the host band early in a thin or launching city,
 * how a night works, the proof, the host band late in a busy city, the
 * organisers, the notify capture, the FAQ and the footer. It arranges the
 * library's section components and binds the controller's view of the city.
 */
export function HomePageSections({captures, downloadUrl, home}: {captures: CaptureSlots; home: Home; downloadUrl?: string}) {
  const early = home.state !== "busy";
  // The founding offer shows only while the city's public counter reads open, never a place that is gone.
  const offerOpen = useFoundingHostOffer(early ? home.marketId : undefined);
  return (
    <>
      <PublicSiteHeader
        actions={<><CityPicker cities={home.cities} onChoose={home.chooseCity} selected={home.city} /><CatchButton href="#app" label={copy.header.app} size="sm" /></>}
        whatsOnHref={home.exploreHref}
      />
      <WebsitePageMain id="top">
        <HomeHero captures={captures} home={home} offerOpen={offerOpen} />
        {home.live ? <HomePlans home={home} /> : <HomeLaunchingSoon home={home} />}
        {early ? <HomeHosts captures={captures} home={home} offerOpen={offerOpen} /> : null}
        <HomeNight captures={captures} />
        <HomeProof home={home} />
        {early ? null : <HomeHosts captures={captures} home={home} offerOpen={offerOpen} />}
        <HomeOrganisers home={home} />
        <HomeApp captures={captures} downloadUrl={downloadUrl} home={home} />
        <HomeFaq />
      </WebsitePageMain>
      <PublicSiteFooter appHref="#app" cities={footerCities(home.cities)} exploreHref={home.exploreHref} />
    </>
  );
}
