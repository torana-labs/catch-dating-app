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
  CatchGroundCard,
  CatchHeroSection,
  CatchQrCode,
  CatchReviewItem,
  CatchSiteDock,
  CatchSplitSection,
  CatchStack,
  CatchText,
  type CatchBandAction,
  type CatchCardGridEntry,
  type CatchCtaSectionTile,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {guestAppActionLabel, guestAppLive, whatsappChatCopy, whatsappChatHref} from "@content/site";
import {captureSlot, type CaptureSlots} from "../../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../../shared/site";
import {Form} from "../../../shared/ui/primitives";
import {useAppDownloadCtas} from "../../marketing/useAppDownloadCtas";
import {useFoundingHostOffer} from "../../marketing/useFoundingHostOffer";
import {CityPicker} from "./CityPicker";
import type {HomeFilter, HomePageController} from "../useHomePageController";
import {useAppNoticeController} from "../../marketing/useAppNoticeController";
import {useLaunchNoticeController} from "../useLaunchNoticeController";
import {useCityAlertsController} from "../leads/useCityAlertsController";
import {useHostReferralController, type HostReferralField} from "../leads/useHostReferralController";
import {formatGrounds} from "../homeModel";
import {cityChromeLinks, footerCities} from "./cityChrome";
import type {DiscoveryFormatKey} from "../../discovery/discoveryTypes";

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
      // The soonest real plan floats over the phone; there is none to show before a city has plans.
      aside={plan ? {
        title: plan.title,
        meta: plan.availability ? fill(copy.hero.chipMeta, {place: plan.place, availability: plan.availability}) : plan.place,
        date: {...plan.date, ground: plan.format ? formatGrounds[plan.format] : "paper"},
      } : undefined}
      ground="pink"
      id="home-hero"
      kicker={home.heroEyebrow}
      lead={copy.hero.body}
      // The board's proof line ("Every host verified · ★ … from … guests") waits for real data: nothing reads verified hosts
      // or a review count yet, so it is left out rather than shown with placeholders.
      media={explore ? <CatchAppCaptureImage {...explore} bezel bleed caption={undefined} size="hero" tilt="left" /> : undefined}
      // Before the app is on a store, no "Coming soon" badges that capture nothing (leak 2): the notify card instead.
      notice={guestAppLive ? undefined : {title: copy.hero.notice.title, body: fill(copy.hero.notice.body, {city}), children: <AppNoticeForm compact home={home} />}}
      title={copy.hero.title}
    />
  );
}

/** "Whoever you are": six ways in, each to the city's plans, its new-to-the-city page or the band it names. */
function HomeEntries({home}: {home: Home}) {
  const city = home.city.label;
  const targets: Record<string, Pick<CatchCardGridEntry, "href" | "ground" | "icon">> = {
    new: {href: home.discovery.newToCity ?? home.exploreHref, ground: "coral", icon: "location"},
    solo: {href: "#how", ground: "pink", icon: "person"},
    level: {href: home.exploreHref, ground: "mint", icon: "trend"},
    friends: {href: home.exploreHref, ground: "yellow", icon: "people"},
    daytime: {href: home.exploreHref, ground: "indigo", icon: "anytime"},
    safety: {href: "#safety", ground: "ink", icon: "safety"},
  };
  return (
    <CatchCardGrid
      align="center"
      columns={6}
      id="first-plan"
      items={copy.entries.items.map((item) => ({id: item.id, title: item.id === "new" ? fill(copy.entries.items[0].title, {city}) : item.title, body: item.body,
        ...targets[item.id]}))}
      kicker={copy.entries.eyebrow}
      kind="entry"
      title={copy.entries.title}
    />
  );
}

/**
 * The city's format page for a card's format or a chip's word, where that
 * page exists (the board: "every format links to an indexable city page").
 */
const cardFormatPages: Record<string, DiscoveryFormatKey> = {run: "runClubs", courts: "racketSports", dinner: "supper", games: "quizNights", nightsOut: "nightlife"};
const chipFormatPages: Record<string, DiscoveryFormatKey> = {yoga: "studios", workshop: "workshops", "book club": "books", cycling: "outdoors"};
const formatPageHref = (home: Home, format: DiscoveryFormatKey | undefined) =>
  home.discovery.formats.find((link) => link.format === format)?.href;

/**
 * "Start with what you feel like doing": the formats, each to the city's
 * page for it, and more kinds as chips. A format with no page in the city
 * yet filters the city's plans instead (?format= and ?q= keep working).
 */
function HomeFormats({home}: {home: Home}) {
  const city = home.city.label;
  // Only photos approved for the live site; a format without one shows its activity artwork (website-v2 README, #875).
  const photos: Partial<Record<string, string>> = {run: "/assets/events/social-run-music-hero-960.jpg", dinner: "/assets/marketing/home-dinner.jpg"};
  const chipDots = ["indigo", "yellow", "pink", "mint"] as const;
  return (
    <CatchCardGrid
      chips={copy.formats.chips.map((chip, index) => ({label: chip.label, dot: chipDots[index % chipDots.length],
        href: formatPageHref(home, chipFormatPages[chip.search]) ?? `${home.exploreHref}?q=${encodeURIComponent(chip.search)}`}))}
      columns={5}
      id="formats"
      items={copy.formats.cards.map((card) => ({
        id: card.format, title: card.title, body: card.body, more: fill(card.more, {city}),
        href: formatPageHref(home, cardFormatPages[card.format]) ?? `${home.exploreHref}?format=${card.format}`,
        ground: formatGrounds[card.format], format: card.format, photoUrl: photos[card.format],
      }))}
      kicker={copy.formats.eyebrow}
      kickerAccent="mint"
      kind="format"
      layout="rail"
      lead={copy.formats.lead}
      title={copy.formats.title}
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
      empty={{title: home.note}}
      filters={<PlanFilters home={home} />}
      // A thin week offers new plans on WhatsApp under the cards (the board's .inline bar).
      footer={thin && !home.unavailable ? <CityAlertsBar home={home} /> : undefined}
      ground="paper"
      headerAction={{label: thin ? copy.week.thinAction : fill(copy.week.action, {city}), href: home.exploreHref}}
      id="whats-on"
      items={home.plans.map((plan) => ({
        id: plan.key, href: plan.href, title: plan.title, label: plan.label, format: plan.format, detail: plan.detail,
        price: plan.price, availability: plan.availability, photoUrl: plan.photoUrl, posterLabel: plan.posterLabel, date: plan.date,
      }))}
      // A city that could not be read carries no count and is never called new.
      kicker={home.unavailable ? undefined : home.upcoming ? copy.week.upcomingEyebrow : home.weekCount > 1 ? fill(copy.week.eyebrow, {count: home.weekCount}) :
        home.weekCount ? copy.week.eyebrowOne : fill(copy.week.eyebrowNew, {city})}
      kind="plan"
      layout="rail"
      lead={thin ? fill(copy.week.thinLead, {city}) : areas ? fill(copy.week.lead, {areas}) : fill(copy.week.leadNoAreas, {city})}
      links={home.otherCities}
      title={fill(home.upcoming ? copy.week.upcomingTitle : copy.week.title, {city})}
    />
  );
}

/** The privacy policy beside a form's consent line, as the canvas's fine print. */
function ConsentLine({privacy, text}: {privacy: string; text: string}) {
  return (
    <CatchStack direction="row" gap={8} railWidth="fit">
      <CatchText tone="secondary" variant="body-meta">{text}</CatchText>
      <CatchButton href="/privacy/" label={privacy} size="sm" variant="quiet" />
    </CatchStack>
  );
}

/**
 * A lead form's outcome: its confirmation, or why the send did not go
 * through, announced either way. It keeps the ground's ink (the danger red
 * does not hold its contrast on the mint panel); the button beside it offers
 * to try again.
 */
function LeadStatus({problem, sent}: {problem: string | null; sent: string | null}) {
  return <CatchText aria-live="polite" as="p" role="status" variant="body">{sent ?? problem ?? ""}</CatchText>;
}

/**
 * A thin week's "Want to hear first?" bar (the board's .inline): a WhatsApp
 * number for new plans in the city, sent as a city alerts lead. The words sit
 * beside the number and the button; they stack on a phone. After a failed
 * send the button offers to try again with the same request.
 */
function CityAlertsBar({home}: {home: Home}) {
  const city = home.city.label;
  const alerts = useCityAlertsController({label: city, slug: home.city.slug, source: home.citySource});
  const words = copy.alerts;
  return (
    <CatchGroundCard ground="white">
      <CatchStack gap={8}>
        {alerts.sent ? null : (
          <Form aria-label={words.title} noValidate onSubmit={alerts.handleSubmit} pending={alerts.submitting}>
            <CatchStack gap={8}>
              <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={12}>
                <CatchText as="p" variant="body"><CatchText as="span" variant="label-action">{words.title}</CatchText> {fill(words.body, {city})}</CatchText>
                <CatchStack align="center" collapseBelow="medium" direction="row" gap={8} railWidth="fit">
                  <CatchField autoComplete="tel-national" errorText={alerts.phoneProblem} inputHint={words.phone}
                    inputMode={alerts.submitting ? "inactive" : "editable"} keyboardType="phone" labelMode="hidden" onChanged={alerts.setPhone}
                    prefixText={activeMarket.dialCode} recipe="input" required title={words.phone} value={alerts.phone} />
                  <CatchButton label={alerts.sendProblem ? words.retry : words.action} onPressed={() => undefined} size="sm"
                    status={alerts.submitting ? "loading" : "idle"} type="submit" />
                </CatchStack>
              </CatchStack>
              <ConsentLine privacy={words.privacy} text={fill(words.consent, {city})} />
            </CatchStack>
          </Form>
        )}
        <LeadStatus problem={alerts.sendProblem} sent={alerts.sent ? fill(words.sent, {city}) : null} />
      </CatchStack>
    </CatchGroundCard>
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
      kickerAccent="pink"
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
      kickerAccent="pink"
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

/**
 * "Get notified": one WhatsApp message when the app launches, new plans only
 * if ticked. Compact, in the hero's notify card, the number and the button
 * share a row (they stack on a phone).
 */
function AppNoticeForm({compact = false, home}: {compact?: boolean; home: Home}) {
  const city = home.city.label;
  const notice = useAppNoticeController(city, undefined, {slug: home.city.slug, source: home.citySource});
  const notify = copy.app.notify;
  const field = (
    <CatchField autoComplete="tel-national" errorText={notice.status.tone === "is-error" ? notice.status.message : null} inputHint={notify.phoneHint}
      inputMode={notice.sending ? "inactive" : "editable"} keyboardType="phone" labelMode="hidden" onChanged={notice.setPhone} prefixText={activeMarket.dialCode}
      recipe="input" required title={notify.phone} value={notice.phone} />
  );
  const submit = (
    <CatchButton label={notify.action} onPressed={() => undefined} size={compact ? "sm" : "lg"} status={notice.sending ? "loading" : "idle"} type="submit" />
  );
  return (
    <CatchStack gap={12}>
      {notice.joined ? null : (
        <Form noValidate onSubmit={notice.handleSubmit} pending={notice.sending}>
          <CatchStack gap={compact ? 8 : 12}>
            {compact ? <CatchStack collapseBelow="medium" direction="row" gap={8} railWidth="fit">{field}{submit}</CatchStack> : field}
            <CatchCheckboxInput label={fill(notify.newPlans, {city})} onChanged={notice.sending ? null : notice.setNewPlans} value={notice.newPlans} />
            {compact ? null : <CatchStack align="start">{submit}</CatchStack>}
            {/* The consent line in the canvas's fine print, with the privacy policy across from it. */}
            <CatchStack direction="row" gap={8} railWidth="fit">
              <CatchText tone="secondary" variant="body-meta">{notify.consent}</CatchText>
              <CatchButton href="/privacy/" label={notify.privacy} size="sm" variant="quiet" />
            </CatchStack>
          </CatchStack>
        </Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{notice.status.tone === "is-success" ? notice.status.message : ""}</CatchText>
    </CatchStack>
  );
}

/**
 * The app band (the board's bento): what the app does in tiles around the
 * notice, or the store badges and QR code once it is on a store (CAT-204).
 * The Book tile's small card is the soonest real plan, when there is one.
 */
function HomeApp({downloadUrl, home}: {downloadUrl?: string; home: Home}) {
  const stores = useAppDownloadCtas({placement: "home_app_band"});
  const tiles = copy.app.tiles;
  const plan = home.heroPlan;
  const bento: CatchCtaSectionTile[] = [
    {id: "book", ground: "coral", ...tiles.book, aside: plan ? (
      <CatchStack gap={2}>
        <CatchText as="span" variant="label-badge">{plan.title}</CatchText>
        <CatchText as="span" variant="body-meta">{fill(copy.app.bookCard, {when: plan.when, price: plan.price})}</CatchText>
      </CatchStack>
    ) : undefined},
    {id: "reminders", ground: "yellow", ...tiles.reminders},
    {id: "chat", ground: "ink", ...tiles.chat},
    {id: "follow", ground: "mint", ...tiles.follow},
    {id: "solo", ground: "pink", ...tiles.solo, wide: true},
    {id: "free", ground: "magenta", ...tiles.free, wide: true},
  ];
  if (guestAppLive) {
    return (
      <CatchCtaSection
        capture={downloadUrl ? (
          <CatchStack align="start" gap={8}>
            <CatchQrCode label={copy.app.qrLabel} value={downloadUrl} />
            <CatchText variant="label-action">{copy.app.qr}</CatchText>
          </CatchStack>
        ) : undefined}
        id="app"
        kicker={copy.app.eyebrow}
        lead={copy.app.body}
        stores={stores.map((store) => ({badgeSrc: store.badgeSrc, comingSoon: store.comingSoon, href: store.href || undefined, label: store.accessibleLabel,
          onClick: store.onClick, size: "l", store: store.store}))}
        tiles={bento}
        title={copy.app.title}
        titleSize="feature"
      />
    );
  }
  return (
    <CatchCtaSection capture={<AppNoticeForm home={home} />} id="app" kicker={copy.app.soonEyebrow} tiles={bento} title={copy.app.soonTitle} titleSize="feature" />
  );
}

/**
 * "Know a host": the canvas's referral form beside the panel's copy. The
 * person's name and WhatsApp number, then the host's name, their Instagram or
 * website and how the person knows them, sent as a referral lead with the
 * page's city; staff follow up on WhatsApp. After a failed send the button
 * offers to try again with the same request.
 */
function HostReferralForm({home}: {home: Home}) {
  const refer = useHostReferralController({label: home.city.label, slug: home.city.slug, source: home.citySource});
  const words = copy.refer;
  const field = (name: HostReferralField, title: string, autoComplete?: string) => (
    <CatchField autoComplete={autoComplete} errorText={refer.problem(name)} inputHint={title} inputMode={refer.submitting ? "inactive" : "editable"}
      labelMode="hidden" onChanged={refer.set(name)} recipe="input" required title={title}
      keyboardType={name === "phone" ? "phone" : undefined} prefixText={name === "phone" ? activeMarket.dialCode : undefined} value={refer.answers[name]} />
  );
  return (
    <CatchStack gap={12}>
      {refer.sent ? null : (
        <Form aria-label={words.title} noValidate onSubmit={refer.handleSubmit} pending={refer.submitting}>
          <CatchStack gap={12}>
            <CatchStack collapseBelow="medium" direction="row" equal gap={8}>{field("fullName", words.name, "name")}{field("phone", words.phone, "tel-national")}</CatchStack>
            <CatchStack collapseBelow="medium" direction="row" equal gap={8}>{field("hostName", words.hostName, "off")}{field("hostLink", words.hostLink, "off")}</CatchStack>
            {field("relationship", words.relationship, "off")}
            <CatchStack align="start">
              <CatchButton label={refer.sendProblem ? words.retry : words.action} onPressed={() => undefined} status={refer.submitting ? "loading" : "idle"} type="submit" />
            </CatchStack>
            <ConsentLine privacy={words.privacy} text={words.consent} />
          </CatchStack>
        </Form>
      )}
      <LeadStatus problem={refer.sendProblem} sent={refer.sent ? refer.sentMessage : null} />
    </CatchStack>
  );
}

/** The mint refer panel: a guest introduces a host through the referral form. */
function HomeRefer({home}: {home: Home}) {
  return (
    <CatchCtaSection
      form={<HostReferralForm home={home} />}
      ground="mint"
      id="refer"
      kicker={copy.refer.eyebrow}
      lead={copy.refer.lead}
      title={copy.refer.title}
    />
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
 * city's state: the site header with the city picker, the hero, the entry
 * tiles, the plans (or the launch notice), the host band early in a thin or
 * launching city, the formats, how a night works, the proof, the host band
 * late in a busy city, the organisers, the app band, the refer panel, the
 * FAQ, the footer and the phone action bar. It arranges the
 * library's section components and binds the controller's view of the city.
 */
export function HomePageSections({captures, downloadUrl, home}: {captures: CaptureSlots; home: Home; downloadUrl?: string}) {
  const early = home.state !== "busy";
  // The founding offer shows only while the city's public counter reads open, never a place that is gone.
  const offerOpen = useFoundingHostOffer(early ? home.marketId : undefined);
  const chrome = cityChromeLinks(home.city, home.discovery);
  return (
    <>
      <PublicSiteHeader
        actions={<><CityPicker cities={home.cities} onChoose={home.chooseCity} selected={home.city} /><CatchButton href="#app" label={copy.header.app} size="sm" /></>}
        newToCity={chrome.newToCity}
        whatsOnHref={home.exploreHref}
      />
      <WebsitePageMain id="top">
        <HomeHero captures={captures} home={home} offerOpen={offerOpen} />
        <HomeEntries home={home} />
        {home.live ? <HomePlans home={home} /> : <HomeLaunchingSoon home={home} />}
        {early ? <HomeHosts captures={captures} home={home} offerOpen={offerOpen} /> : null}
        <HomeFormats home={home} />
        <HomeNight captures={captures} />
        <HomeProof home={home} />
        {early ? null : <HomeHosts captures={captures} home={home} offerOpen={offerOpen} />}
        <HomeOrganisers home={home} />
        <HomeApp downloadUrl={downloadUrl} home={home} />
        <HomeRefer home={home} />
        <HomeFaq />
      </WebsitePageMain>
      <PublicSiteFooter appHref="#app" cities={footerCities(home.cities)} cityFormats={chrome.cityFormats} exploreHref={home.exploreHref} />
      <CatchSiteDock
        label={copy.dock.label}
        primary={{label: guestAppActionLabel, href: home.live ? "#app" : "#whats-on", accent: "pink"}}
        secondary={home.live ? {label: copy.dock.plans, href: "#whats-on"} : {label: copy.hero.hostAction, href: "/host/"}}
      />
    </>
  );
}
