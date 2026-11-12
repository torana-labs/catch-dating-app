import {
  CatchAccordion,
  CatchAppCaptureImage,
  CatchButton,
  CatchDeviceFrame,
  CatchHeroShowcase,
  CatchIndexRow,
  CatchMetricTile,
  CatchRail,
  CatchSection,
  CatchStack,
  CatchStepList,
  CatchSurface,
  CatchText,
  useCatch,
  type CatchAppCaptureImageProps,
  type CatchIconName,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {brand} from "@content/brand";
import {weddingsApplyPath, weddingsCopy as copy, type WeddingsScreen} from "@content/weddings";
import {captureSlot, type CaptureSlots} from "../../../shared/media/captureSlot";
import type {WeddingsLandingController} from "../useWeddingsController";
import {StepOneCard} from "./weddingsApplicationSections";

type Screens = Record<string, CatchAppCaptureImageProps | null>;

/**
 * Every programme screen the page shows, by capture slot. Each slot is named
 * literally so tool/marketing/capture_manifest.json's page bindings can be
 * checked against the page (marketingCaptures.test.tsx).
 */
function weddingScreens(captures: CaptureSlots): Screens {
  return {
    "wedding-rsvp": captureSlot(captures, "wedding-rsvp"),
    "wedding-itinerary": captureSlot(captures, "wedding-itinerary"),
    "wedding-whatsapp": captureSlot(captures, "wedding-whatsapp"),
    "wedding-ids": captureSlot(captures, "wedding-ids"),
    "wedding-door": captureSlot(captures, "wedding-door"),
    "wedding-departures": captureSlot(captures, "wedding-departures"),
    "wedding-driver": captureSlot(captures, "wedding-driver"),
    "wedding-message": captureSlot(captures, "wedding-message"),
    "wedding-family": captureSlot(captures, "wedding-family"),
    "wedding-guests": captureSlot(captures, "wedding-guests"),
    "wedding-rooms": captureSlot(captures, "wedding-rooms"),
    "wedding-live": captureSlot(captures, "wedding-live"),
    "wedding-reconcile": captureSlot(captures, "wedding-reconcile"),
    "wedding-hotel": captureSlot(captures, "wedding-hotel"),
  };
}

/** A desktop screen in the quiet browser window (W1), with the line under it. */
function BrowserShot({screens, slot, address, caption, tone = "secondary"}: {
  screens: Screens;
  slot: string;
  address: string;
  caption?: string;
  tone?: CatchTextTone;
}) {
  const screen = screens[slot];
  if (!screen) return null;
  return (
    <CatchStack gap={16}>
      <CatchDeviceFrame address={`${brand.web.domain}${address}`} kind="browser"><CatchAppCaptureImage {...screen} caption={undefined} /></CatchDeviceFrame>
      {caption ? <CatchText tone={tone} variant="body-meta">{caption}</CatchText> : null}
    </CatchStack>
  );
}

/** A phone screen with its caption under it. */
function PhoneShot({screens, screen: {slot, caption, detail}, size = "sm"}: {screens: Screens; screen: WeddingsScreen; size?: "sm" | "fill"}) {
  const screen = screens[slot];
  if (!screen) return null;
  return (
    <CatchStack align="center" gap={12}>
      <CatchAppCaptureImage {...screen} caption={undefined} size={size} />
      <CatchStack align="center" gap={4}>
        <CatchText align="center" variant={detail ? "label-action" : "body-meta"}>{caption}</CatchText>
        {detail ? <CatchText align="center" tone="secondary" variant="body-meta">{detail}</CatchText> : null}
      </CatchStack>
    </CatchStack>
  );
}

/** A section opening: a coloured kicker over a display headline, across from its lead on a wide page. */
function HeadingRow({id, kicker, title, body, tone = "secondary", size = "display-xl", as = "h2"}: {
  id?: string;
  kicker: string;
  title: string;
  body: string;
  tone?: CatchTextTone;
  size?: "display-xl" | "display-lg";
  as?: "h2" | "h3";
}) {
  return (
    <CatchStack align="end" collapseBelow="expanded" direction="row" equal gap={48}>
      <CatchStack gap={12}>
        <CatchText tone={tone} variant="label-kicker">{kicker}</CatchText>
        <CatchText as={as} id={id} variant={size}>{title}</CatchText>
      </CatchStack>
      <CatchText tone="secondary" variant="body-lead">{body}</CatchText>
    </CatchStack>
  );
}

function Points({points}: {points: readonly {icon: string; title: string; body: string}[]}) {
  return (
    <CatchSection dividers="none">
      {points.map((point) => <CatchIndexRow density="regular" icon={point.icon as CatchIconName} key={point.title} subtitle={point.body} title={point.title} wrap />)}
    </CatchSection>
  );
}

/** One chapter of the followed wedding: its words beside its screens; they stack below the expanded width. */
function Chapter({id, kicker, tone, title, body, points, children}: {
  id?: string;
  kicker: string;
  tone?: CatchTextTone;
  title: string;
  body: string;
  points: readonly {icon: string; title: string; body: string}[];
  children: ReactNode;
}) {
  return (
    <CatchStack align="center" collapseBelow="expanded" direction="row" equal gap={48}>
      <CatchStack gap={20}>
        <CatchText tone={tone} variant="label-kicker">{kicker}</CatchText>
        <CatchText as="h3" id={id} variant="display-lg">{title}</CatchText>
        <CatchText variant="body-lead">{body}</CatchText>
        <Points points={points} />
      </CatchStack>
      <CatchStack gap={16}>{children}</CatchStack>
    </CatchStack>
  );
}

function Hero({screens}: {screens: Screens}) {
  const {sizeClass} = useCatch();
  const rsvp = screens[copy.hero.slot];
  return (
    <CatchSurface aria-labelledby="wed-hero-title" as="section" block="band">
      <CatchStack align="center" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText tone="danger" variant="label-kicker">{copy.hero.kicker}</CatchText>
          {/* One h1: the shorter line on a phone (owner, 9 Nov). */}
          <CatchText as="h1" id="wed-hero-title" variant="display-hero">{sizeClass === "compact" ? copy.hero.titleShort : copy.hero.title}</CatchText>
          <CatchText tone="secondary" variant="body-lead">{copy.hero.body}</CatchText>
          <CatchStack direction="row" gap={8} wrap>
            <CatchButton href="#apply" label={copy.hero.apply} />
            <CatchButton href="#follow" label={copy.hero.follow} variant="secondary" />
          </CatchStack>
          <CatchText tone="secondary" variant="label-action">{copy.hero.note}</CatchText>
        </CatchStack>
        <CatchHeroShowcase device={rsvp ? <CatchAppCaptureImage {...rsvp} caption={undefined} tilt="left" /> : null} ground="yellow" stickers={copy.hero.stickers} />
      </CatchStack>
    </CatchSurface>
  );
}

function RunningOrder() {
  const order = copy.order;
  return (
    <CatchSurface aria-labelledby="wed-order-title" as="section" block="band" color="tile">
      <CatchStack align="end" collapseBelow="medium" direction="row" gap={24} justify="between">
        <CatchStack gap={8}>
          <CatchText tone="secondary" variant="label-kicker">{order.kicker}</CatchText>
          <CatchText as="h2" id="wed-order-title" variant="display-lg">{order.title}</CatchText>
        </CatchStack>
        <CatchText tone="secondary" variant="body-meta">{order.illustrative}</CatchText>
      </CatchStack>
      <CatchSurface block="floating" padding="md">
        {/* Three months to a row from expanded up, as the board lays them out; one column below. */}
        <CatchStack gap={8}>
          {[order.rows.slice(0, 3), order.rows.slice(3)].map((months) => (
            <CatchStack collapseBelow="expanded" direction="row" equal gap={24} key={months[0].title}>
              {months.map((row) => (
                <CatchIndexRow date={{day: row.month, date: row.day}} density="regular" key={row.title} status={row.status} statusTone={row.tone}
                  subtitle={row.subtitle} title={row.title} wrap />
              ))}
            </CatchStack>
          ))}
        </CatchStack>
      </CatchSurface>
    </CatchSurface>
  );
}

function Problem() {
  const problem = copy.problem;
  return (
    <CatchSurface aria-labelledby="wed-problem-title" as="section" block="band" color="ink">
      <HeadingRow body={problem.body} id="wed-problem-title" kicker={problem.kicker} title={problem.title} tone="warning" />
      <CatchSection dividers="between">
        {problem.pains.map((pain) => (
          <CatchSurface block="plain" key={pain.number} padding="sm">
            <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={24}>
              <CatchStack align="start" direction="row" gap={24}>
                <CatchText numeric tone="warning" variant="display-sm">{pain.number}</CatchText>
                <CatchStack gap={4}>
                  <CatchText as="h3" variant="title-bar">{pain.title}</CatchText>
                  <CatchText tone="secondary" variant="body">{pain.before}</CatchText>
                </CatchStack>
              </CatchStack>
              <CatchStack gap={4}>
                <CatchText tone="success" variant="label-kicker">{problem.withCatch}</CatchText>
                <CatchText variant="body">{pain.after}</CatchText>
              </CatchStack>
            </CatchStack>
          </CatchSurface>
        ))}
      </CatchSection>
    </CatchSurface>
  );
}

function Follow({screens}: {screens: Screens}) {
  const follow = copy.follow;
  const {setUp, invite, writeIn, travel, weekend, after} = follow;
  return (
    <>
      <CatchSurface aria-labelledby="wed-follow-title" as="section" block="band" id="follow">
        <HeadingRow body={follow.lead} id="wed-follow-title" kicker={follow.kicker} title={follow.title} tone="info" />
        <Chapter body={setUp.body} kicker={setUp.kicker} points={setUp.points} title={setUp.title}>
          <BrowserShot address={setUp.screen.address} caption={setUp.screen.caption} screens={screens} slot={setUp.screen.slot} />
        </Chapter>
      </CatchSurface>
      <CatchSurface aria-labelledby="wed-ch2-title" as="section" block="band" color="dinner">
        <Chapter body={invite.body} id="wed-ch2-title" kicker={invite.kicker} points={invite.points} title={invite.title}>
          <CatchStack align="start" direction="row" equal gap={24}>
            {invite.screens.map((screen) => <PhoneShot key={screen.slot} screen={screen} screens={screens} size="fill" />)}
          </CatchStack>
        </Chapter>
      </CatchSurface>
      <CatchSurface aria-labelledby="wed-ch3-title" as="section" block="band">
        <Chapter body={writeIn.body} id="wed-ch3-title" kicker={writeIn.kicker} points={writeIn.points} title={writeIn.title} tone="success">
          <CatchStack align="start" direction="row" equal gap={24}>
            {writeIn.screens.map((screen) => <PhoneShot key={screen.slot} screen={screen} screens={screens} size="fill" />)}
          </CatchStack>
        </Chapter>
      </CatchSurface>
      <CatchSurface aria-labelledby="wed-ch4-title" as="section" block="band" color="tile">
        <Chapter body={travel.body} id="wed-ch4-title" kicker={travel.kicker} points={travel.points} title={travel.title} tone="info">
          <BrowserShot address={travel.screen.address} caption={travel.screen.caption} screens={screens} slot={travel.screen.slot} />
        </Chapter>
      </CatchSurface>
      <CatchSurface aria-labelledby="wed-ch5-title" as="section" block="band" color="ink">
        <HeadingRow as="h3" body={weekend.body} id="wed-ch5-title" kicker={weekend.kicker} title={weekend.title} tone="warning" />
        <BrowserShot address={weekend.screen.address} screens={screens} slot={weekend.screen.slot} />
        <CatchRail itemWidth={230} label={weekend.staffLabel}>
          {weekend.staff.map((screen) => <PhoneShot key={screen.slot} screen={screen} screens={screens} size="fill" />)}
        </CatchRail>
      </CatchSurface>
      <CatchSurface aria-labelledby="wed-ch6-title" as="section" block="band" color="courts">
        <Chapter body={after.body} id="wed-ch6-title" kicker={after.kicker} points={after.points} title={after.title}>
          <BrowserShot address={after.screen.address} caption={after.screen.caption} screens={screens} slot={after.screen.slot} tone="inherit" />
        </Chapter>
      </CatchSurface>
    </>
  );
}

function Team({screens}: {screens: Screens}) {
  const team = copy.team;
  return (
    <CatchSurface aria-labelledby="wed-team-title" as="section" block="band" id="team">
      <HeadingRow body={team.body} id="wed-team-title" kicker={team.kicker} title={team.title} tone="primary" />
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchSection dividers="between">
          {team.roles.map((role) => (
            <CatchIndexRow density="compact" icon={role.icon} key={role.title} subtitle={role.body} title={role.title} value={role.access} wrap />
          ))}
        </CatchSection>
        <CatchStack gap={8}>
          <BrowserShot address={team.hotel.address} screens={screens} slot={team.hotel.slot} />
          <CatchText variant="title-row">{team.hotel.title}</CatchText>
          <CatchText tone="secondary" variant="body-small">{team.hotel.body}</CatchText>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

function MessagesAndFamily({screens}: {screens: Screens}) {
  const {messages, family} = copy;
  const message = screens[messages.slot];
  const familyScreen = screens[family.slot];
  return (
    <CatchSurface aria-labelledby="wed-messages-title" as="section" block="band" color="tile">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText tone="info" variant="label-kicker">{messages.kicker}</CatchText>
          <CatchText as="h2" id="wed-messages-title" variant="display-lg">{messages.title}</CatchText>
          <CatchText variant="body">{messages.body}</CatchText>
          <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={24}>
            {message ? <CatchAppCaptureImage {...message} caption={undefined} size="sm" /> : null}
            <CatchSection dividers="between" title={messages.listTitle}>
              {messages.rows.map((row) => (
                <CatchIndexRow density="compact" key={row.title} status={row.status} statusTone={row.tone} subtitle={row.when} title={row.title} wrap />
              ))}
            </CatchSection>
          </CatchStack>
        </CatchStack>
        <CatchStack gap={20}>
          <CatchText tone="danger" variant="label-kicker">{family.kicker}</CatchText>
          <CatchText as="h2" variant="display-lg">{family.title}</CatchText>
          <CatchText variant="body">{family.body}</CatchText>
          <CatchStack align="start" collapseBelow="medium" direction="row" equal gap={24}>
            {familyScreen ? <CatchAppCaptureImage {...familyScreen} caption={undefined} size="sm" /> : null}
            <CatchStack gap={16}>
              <CatchStack direction="row" equal gap={12}>
                {family.stats.map((stat) => <CatchMetricTile key={stat.label} label={stat.label} value={stat.value} />)}
              </CatchStack>
              <CatchSection dividers="between" title={family.dietsTitle}>
                {family.diets.map((diet) => <CatchIndexRow density="compact" key={diet.label} title={diet.label} value={diet.count} />)}
              </CatchSection>
            </CatchStack>
          </CatchStack>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

function Pricing() {
  const pricing = copy.pricing;
  return (
    <CatchSurface aria-labelledby="wed-pricing-title" as="section" block="band" color="games" id="pricing">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText variant="label-kicker">{pricing.kicker}</CatchText>
          <CatchText as="h2" id="wed-pricing-title" variant="display-xl">{pricing.title}</CatchText>
          <CatchText variant="body-lead">{pricing.body}</CatchText>
          <CatchSection dividers="none" title={pricing.includedTitle}>
            {pricing.included.map((item) => <CatchIndexRow density="compact" icon="check" key={item} title={item} wrap />)}
          </CatchSection>
        </CatchStack>
        <CatchSurface block="floating" padding="lg">
          <CatchStack align="baseline" direction="row" gap={8} justify="between" wrap>
            <CatchText as="h3" variant="display-sm">{pricing.tiersTitle}</CatchText>
            <CatchText tone="secondary" variant="label-action">{pricing.quote}</CatchText>
          </CatchStack>
          <CatchSection dividers="between">
            {pricing.tiers.map((tier) => (
              <CatchIndexRow density="regular" icon="people" key={tier.title} status={tier.badge || undefined} statusTone="success" subtitle={tier.body} title={tier.title} wrap />
            ))}
          </CatchSection>
          <CatchButton fill href="#apply" label={pricing.action} />
          <CatchText tone="secondary" variant="body-small">{pricing.atCost}</CatchText>
        </CatchSurface>
      </CatchStack>
    </CatchSurface>
  );
}

function Pilot({landing}: {landing: WeddingsLandingController}) {
  const pilot = copy.pilot;
  return (
    <CatchSurface aria-labelledby="wed-pilot-title" as="section" block="band" color="indigo" id="apply">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={20}>
          <CatchText variant="label-kicker">{pilot.kicker}</CatchText>
          <CatchText as="h2" id="wed-pilot-title" variant="display-xl">{pilot.title}</CatchText>
          <CatchText variant="body-lead">{pilot.body}</CatchText>
          <CatchStepList steps={pilot.steps} />
        </CatchStack>
        <CatchStack gap={16}>
          <StepOneCard continueHref={weddingsApplyPath} idPrefix="weddings-landing" onContinue={landing.continueToApply} stepOne={landing.stepOne} />
          <CatchSurface block="tile" padding="md">
            <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
              <CatchText variant="body-small">{pilot.hosting}</CatchText>
              <CatchButton href={pilot.hostingHref} label={pilot.hostingAction} size="md" variant="secondary" />
            </CatchStack>
          </CatchSurface>
        </CatchStack>
      </CatchStack>
    </CatchSurface>
  );
}

function Questions() {
  const faq = copy.faq;
  return (
    <CatchSurface aria-labelledby="wed-faq-title" as="section" block="band" id="questions">
      <CatchStack align="start" collapseBelow="expanded" direction="row" equal gap={48}>
        <CatchStack gap={12}>
          <CatchText tone="success" variant="label-kicker">{faq.kicker}</CatchText>
          <CatchText as="h2" id="wed-faq-title" variant="display-xl">{faq.title}</CatchText>
          <CatchStack align="start"><CatchButton href="#apply" label={faq.apply} /></CatchStack>
        </CatchStack>
        <CatchAccordion exclusive items={faq.items} name="weddings-faq" size="lg" />
      </CatchStack>
    </CatchSurface>
  );
}

/**
 * The landing's bands, as the RbWebWeddings board: the hero, the running
 * order, the problem, one wedding followed chapter by chapter in real
 * programme screens, the team, messages and the family, pricing without
 * numbers, the guided pilot with step 1, and the questions.
 */
export function WeddingsBands({captures, landing}: {captures: CaptureSlots; landing: WeddingsLandingController}) {
  const screens = weddingScreens(captures);
  return (
    <>
      <Hero screens={screens} />
      <RunningOrder />
      <Problem />
      <Follow screens={screens} />
      <Team screens={screens} />
      <MessagesAndFamily screens={screens} />
      <Pricing />
      <Pilot landing={landing} />
      <Questions />
    </>
  );
}
