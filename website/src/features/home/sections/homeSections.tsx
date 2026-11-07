import {
  CatchAccordion,
  CatchButton,
  CatchCheckboxInput,
  CatchChip,
  CatchEventCard,
  CatchField,
  CatchIndexRow,
  CatchMenu,
  CatchMeter,
  CatchOrganizerCard,
  CatchQrCode,
  CatchRail,
  CatchSection,
  CatchStack,
  CatchSurface,
  CatchText,
  type CatchTextTone,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {siteFooterLegalLinks} from "@content/site";
import {PublicSiteHeader, SiteFooterBand, WebsitePageMain} from "../../../shared/site";
import {Form} from "../../../shared/ui/primitives";
import {useAppDownloadCtas} from "../../marketing/useAppDownloadCtas";
import {cityStatusLabel} from "../homeModel";
import type {HomeFilter, HomePageController} from "../useHomePageController";
import {useLaunchNoticeController} from "../useLaunchNoticeController";
import {cityPagePath, organisersHref} from "./cityChrome";

type Home = HomePageController;
const filterValues: HomeFilter[] = ["all", ...homeFormats.map((item) => item.format)];
const areasOf = (home: Home) => homeCityAreas[home.city.marketSlug];
const posterOf = (format: string | null) => homeFormats.find((item) => item.format === format)?.poster;
const helpHref = siteFooterLegalLinks.find((link) => link.href.startsWith("/help"))?.href ?? "/help/";
const legalHref = (prefix: string) => siteFooterLegalLinks.find((link) => link.href.startsWith(prefix))?.href ?? helpHref;

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

function StoreButtons({placement}: {placement: string}) {
  const stores = useAppDownloadCtas({placement});
  return (
    <CatchStack direction="row" gap={8} wrap>
      {stores.map((store) => (
        <CatchButton href={store.href || undefined} key={store.store} label={store.label} leadingIcon="download" onPressed={store.onClick}
          semanticsLabel={store.accessibleLabel} size="md" variant="secondary" />
      ))}
    </CatchStack>
  );
}

function CityPicker({home}: {home: Home}) {
  return (
    <CatchMenu
      align="end"
      builder={(menu) => <CatchButton {...menu.triggerProps} label={home.city.label} onPressed={menu.toggle} size="sm" trailingIcon="expand" variant="secondary" />}
      items={home.cities.map((item) => ({value: item.slug, label: item.label, sublabel: cityStatusLabel(item), selected: item.slug === home.city.slug, variant: "choice" as const}))}
      label={copy.header.cityMenu}
      onSelected={home.chooseCity}
      recipe="anchored"
      width={300}
    />
  );
}

function HomeHero({home}: {home: Home}) {
  const city = home.city.label;
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
        {home.stickers.length ? (
          <CatchSurface aspect={1.05} block="spotlight" color="dinner">
            {home.stickers.map((plan) => (
              <CatchSurface block="floating" key={plan.key} padding="sm">
                <CatchText tone="secondary" variant="label-kicker">{fill(copy.hero.chipKicker, {format: posterOf(plan.format) ?? plan.formatLabel, when: plan.when})}</CatchText>
                <CatchText variant="title-row">{plan.title}</CatchText>
              </CatchSurface>
            ))}
          </CatchSurface>
        ) : null}
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
      <CatchStack align="stretch" collapseBelow="medium" direction="row" equal gap={12}>
        {home.tiles.map((tile) => (
          <CatchSurface block="spotlight" color={tile.format} data-selected={home.live && home.filter === tile.format ? "" : undefined} href="#whats-on" key={tile.format}
            onClick={home.live ? () => home.chooseTile(tile.format) : undefined} padding="md">
            <CatchText variant="label-kicker">{tile.kicker}</CatchText>
            <CatchText variant="display-sm">{tile.title}</CatchText>
            <CatchText variant="body-small">{tile.body}</CatchText>
            {tile.format === "games" ? (
              <CatchSection container="tile">
                {copy.formats.scores.map((score) => <CatchIndexRow density="compact" key={score.title} title={score.title} value={score.value} />)}
              </CatchSection>
            ) : null}
          </CatchSurface>
        ))}
      </CatchStack>
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
          <CatchText tone="danger" variant="label-kicker">{fill(copy.week.eyebrow, {count: home.weekCount})}</CatchText>
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
        <CatchRail itemWidth={240} label={fill(copy.week.title, {city})} wrap="always">
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
function HomeLaunchNotice({city}: {city: string}) {
  const notice = useLaunchNoticeController(city);
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
          <HomeLaunchNotice city={city} />
          <CatchStack gap={4}>
            <CatchText as="h3" variant="title-row">{fill(copy.soon.knowHost, {city})}</CatchText>
            <CatchStack align="start"><CatchButton href="/host/" label={copy.soon.knowHostAction} size="sm" variant="quiet" /></CatchStack>
          </CatchStack>
          <CatchStack gap={8}>
            <CatchText as="h3" variant="title-row">{copy.soon.appTitle}</CatchText>
            <StoreButtons placement="home_launching_soon" />
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

/** A phone-shaped ink spotlight, centred in its column. */
function PhoneMock({children}: {children: ReactNode}) {
  return (
    <CatchStack direction="row" justify="center">
      <CatchSurface aspect={0.52} block="spotlight" color="ink" padding="md">{children}</CatchSurface>
    </CatchStack>
  );
}

function HomeNight() {
  return (
    <CatchSurface aria-labelledby="home-story-title" as="section" block="band" color="ink" id="how">
      <CatchStack align="center" collapseBelow="medium" direction="row" equal gap={64}>
        <CatchStack gap={24}>
          <Heading id="home-story-title" kicker={copy.story.eyebrow} title={copy.story.title} tone="danger" />
          <CatchText tone="secondary" variant="body-lead">{copy.story.lead}</CatchText>
          <CatchSection>
            {copy.story.steps.map((step, index) => (
              <CatchIndexRow density="regular" key={step.title} rank={index + 1} selected={index === 0} subtitle={step.body} title={step.title} wrap />
            ))}
          </CatchSection>
        </CatchStack>
        <PhoneMock>
          <CatchText tone="secondary" variant="label-kicker">{copy.story.phone.kicker}</CatchText>
          <CatchSurface block="spotlight" color="run" padding="md">
            <CatchText variant="label-kicker">{copy.story.phone.nowKicker}</CatchText>
            <CatchText variant="display-sm">{copy.story.phone.now}</CatchText>
          </CatchSurface>
          <CatchSection>
            {copy.story.phone.rows.map((row) => <CatchIndexRow density="compact" key={row} marker={{tone: "format", format: "run"}} title={row} />)}
          </CatchSection>
        </PhoneMock>
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

function HomeHosts() {
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
            <CatchButton href="/host/" label={copy.host.action} />
            <CatchButton href="/claim/" label={copy.host.claim} variant="ghost" />
          </CatchStack>
        </CatchStack>
        <CatchSurface aspect={1.35} block="spotlight" color="ink">
          <CatchText tone="secondary" variant="label-kicker">{copy.host.live.kicker}</CatchText>
          <CatchText variant="display-lg">{copy.host.live.title}</CatchText>
          <CatchMeter label={copy.host.live.meter} thickness={6} value={60} />
          <CatchSection>
            {copy.host.live.scores.map((score, index) => <CatchIndexRow density="compact" key={score.title} rank={index + 1} title={score.title} value={score.value} />)}
          </CatchSection>
        </CatchSurface>
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

function HomeFooter({home}: {home: Home}) {
  const links = copy.footer.links;
  return (
    <SiteFooterBand
      columns={[
        {title: copy.footer.groups.explore, links: [{href: home.exploreHref, label: links.whatsOn}, {href: organisersHref, label: links.organisers}, {href: "#app", label: links.app}]},
        {title: copy.footer.groups.cities, links: home.cities.map((item) => ({href: cityPagePath(item.slug),
          label: item.status === "live" ? item.label : fill(copy.footer.soonCity, {city: item.label})}))},
        {title: copy.footer.groups.hosts, links: [{href: "/host/", label: links.hosts}, {href: "/host/#pricing", label: links.pricing}, {href: "/claim/", label: links.claim}]},
        {title: copy.footer.groups.help, links: [{href: helpHref, label: links.help}, {href: helpHref, label: links.safety},
          {href: legalHref("/privacy"), label: links.privacy}, {href: legalHref("/terms"), label: links.terms}]},
      ]}
      label={copy.footer.nav}
      tagline={copy.footer.tagline}
      wordmark={copy.footer.wordmark}
    />
  );
}

/**
 * The homepage, band for band as the RbWebHomeV2 board: the site header with
 * the city picker, the hero, formats, this week (or launching soon), how a
 * night works, organisers, the host band, the app band, the FAQ and the
 * footer. It arranges system components and binds the controller's view of
 * the city to them.
 */
export function HomePageSections({downloadUrl, home}: {home: Home; downloadUrl?: string}) {
  return (
    <>
      <PublicSiteHeader
        actions={<><CityPicker home={home} /><CatchButton href="#app" label={copy.header.app} size="sm" /></>}
        links={[{href: "#whats-on", label: copy.header.explore}, {href: "#organisers", label: copy.header.organisers}, {href: "/host/", label: copy.header.hosts}]}
      />
      <WebsitePageMain id="top">
        <HomeHero home={home} />
        <HomeFormats home={home} />
        {home.live ? <HomeThisWeek home={home} /> : <HomeLaunchingSoon home={home} />}
        <HomeNight />
        <HomeOrganisers home={home} />
        <HomeHosts />
        <HomeApp downloadUrl={downloadUrl} />
        <HomeFaq />
      </WebsitePageMain>
      <HomeFooter home={home} />
    </>
  );
}
