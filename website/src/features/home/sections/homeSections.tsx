import {
  CatchAccordion,
  CatchAvatar,
  CatchBand,
  CatchButton,
  CatchChip,
  CatchDeviceFrame,
  CatchFormatTile,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchHeroShowcase,
  CatchIndexRow,
  CatchMenu,
  CatchOrganizerCard,
  CatchPlanCard,
  CatchQrCode,
  CatchScroller,
  CatchScrollStory,
  CatchSiteFooter,
  CatchSiteHeader,
  CatchSplit,
  CatchStoreButton,
  CatchText,
  type CatchHeroShowcaseSticker,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {siteFooterLegalLinks} from "@content/site";
import {useAppDownloadCtas, type AppDownloadCta} from "../../marketing/useAppDownloadCtas";
import {cityStatusLabel} from "../homeModel";
import type {HomePageController} from "../useHomePageController";
import {HomeSectionHeading} from "./homeSectionHeading";

type Home = HomePageController;
// A link button's press only navigates.
const follow = () => undefined;
const areasOf = (home: Home) => homeCityAreas[home.city.marketSlug];

function StoreButtons({placement, size = "l", stores}: {placement: string; size?: "m" | "l"; stores?: AppDownloadCta[]}) {
  const fallback = useAppDownloadCtas({placement});
  return (
    <CatchGap direction="horizontal" size="inline" wrap>
      {(stores ?? fallback).map((store) => (
        <CatchStoreButton accessibleLabel={store.accessibleLabel} href={store.href || undefined} key={store.store}
          kicker={size === "l" ? store.kicker : undefined} label={store.label} onClick={store.onClick} size={size} store={store.store} />
      ))}
    </CatchGap>
  );
}

export function HomeHeader({home}: {home: Home}) {
  return (
    <CatchSiteHeader
      actions={
        <CatchMenu
          align="end"
          builder={(menu) => (
            <CatchButton {...menu.triggerProps} label={home.city.label} onPressed={menu.toggle} size="md" variant="secondary" />
          )}
          items={home.cities.map((city) => ({value: city.slug, label: city.label, sublabel: cityStatusLabel(city),
            selected: city.slug === home.city.slug, variant: "choice" as const}))}
          label={copy.header.cityMenu}
          onSelected={home.chooseCity}
          recipe="anchored"
          width={300}
        />
      }
      brandHref="/"
      brandLabel="Catch"
      links={[
        {href: home.exploreHref, label: copy.header.explore},
        {href: "/organizers/", label: copy.header.organisers},
        {href: "/host/", label: copy.header.hosts, compact: true},
      ]}
      navLabel={copy.header.nav}
      wideActions={<CatchButton href="#app" label={copy.header.app} onPressed={follow} size="md" />}
    />
  );
}

export function HomeHero({home}: {home: Home}) {
  const city = home.city.label;
  const stickers: CatchHeroShowcaseSticker[] = home.stickers.map((plan, index) => ({
    label: plan.label, title: plan.title, ground: (["white", "ink", "yellow"] as const)[index],
    labelAccent: plan.format ? ({run: "coral", dinner: "pink", games: "yellow", courts: "mint", nightsOut: "magenta"} as const)[plan.format] : undefined,
  }));
  return (
    <CatchBand aria-labelledby="home-title" pb="regular" pt="compact">
      <CatchSplit
        align="stretch"
        end={
          <CatchHeroShowcase
            device={<CatchDeviceFrame kind="iphone" tilt="left"><img alt={copy.hero.screenAlt} src="/assets/app-screens/explore.png" /></CatchDeviceFrame>}
            ground="pink"
            stickers={stickers}
          />
        }
        start={
          <CatchGap mainAxisAlignment="center" size="section">
            <CatchText as="p" color="coral" variant="supportingStrong">
              {fill(home.live ? copy.hero.liveEyebrow : copy.hero.soonEyebrow, {city})}
            </CatchText>
            <CatchText as="h1" id="home-title" variant="displayXxl">{copy.hero.title}</CatchText>
            <CatchText as="p" color="ink2" variant="bodyLead">{copy.hero.body}</CatchText>
            <CatchGap direction="horizontal" size="inline" wrap>
              <CatchButton href="#whats-on" label={fill(home.live ? copy.hero.liveAction : copy.hero.soonAction, {city})} onPressed={follow} />
              <CatchButton href="/host/" label={copy.hero.hostAction} onPressed={follow} variant="secondary" />
            </CatchGap>
            <StoreButtons placement="home_hero" />
          </CatchGap>
        }
      />
    </CatchBand>
  );
}

export function HomeFormats({home}: {home: Home}) {
  return (
    <CatchBand aria-labelledby="home-formats-title" pb="regular" pt="compact" width="full">
      <CatchGap size="section">
        <CatchBand as="div" pb="none" pt="none">
          <HomeSectionHeading eyebrow={copy.formats.eyebrow} eyebrowAccent="mint" id="home-formats-title" lead={copy.formats.lead} title={copy.formats.title} />
        </CatchBand>
        <CatchScroller grow itemWidth="s" label={copy.formats.label}>
          {home.tiles.map((tile) => home.live ? (
            <CatchFormatTile body={tile.body} format={tile.format} key={tile.format} kicker={tile.kicker} onPressed={() => home.chooseTile(tile.format)}
              photoUrl={tile.photoUrl} pressed={home.filter === tile.format} title={tile.title} />
          ) : (
            <CatchFormatTile body={tile.body} format={tile.format} href="#whats-on" key={tile.format} kicker={tile.kicker} photoUrl={tile.photoUrl} title={tile.title} />
          ))}
        </CatchScroller>
      </CatchGap>
    </CatchBand>
  );
}

export function HomeThisWeek({home}: {home: Home}) {
  const city = home.city.label;
  const areas = areasOf(home);
  return (
    <CatchBand aria-labelledby="home-week-title" ground="paper" id="whats-on" pb="spacious" pt="spacious">
      <CatchGap size="section">
        <HomeSectionHeading
          aside={<CatchButton href={home.exploreHref} label={fill(copy.week.action, {city})} onPressed={follow} />}
          eyebrow={fill(copy.week.eyebrow, {count: home.weekCount})}
          eyebrowAccent="coral"
          id="home-week-title"
          title={fill(copy.week.title, {city})}
        />
        <CatchText as="p" color="ink2" variant="bodyLead">{areas ? fill(copy.week.lead, {areas}) : fill(copy.week.leadNoAreas, {city})}</CatchText>
        <CatchGap aria-label={copy.week.filters} direction="horizontal" role="group" size="inline" wrap>
          <CatchChip label={copy.week.everything} mode="single" onPressed={() => home.setFilter("all")} recipe="choice" selected={home.filter === "all"} />
          {homeFormats.map((item) => (
            <CatchChip key={item.format} label={item.name} mode="single" onPressed={() => home.setFilter(item.format)} recipe="choice" selected={home.filter === item.format} />
          ))}
        </CatchGap>
        {home.plans.length ? (
          <CatchGrid columns={4} compactColumns={1}>
            {home.plans.map((plan) => (
              <CatchPlanCard availability={plan.availability} detail={plan.detail} format={plan.format} href={plan.href} key={plan.key}
                label={plan.label} photoUrl={plan.photoUrl} posterLabel={plan.posterLabel} price={plan.price} title={plan.title} />
            ))}
          </CatchGrid>
        ) : null}
        <CatchText aria-live="polite" as="p" color="ink2" variant="bodyM">{home.note}</CatchText>
      </CatchGap>
    </CatchBand>
  );
}

export function HomeLaunchingSoon({home, signup}: {home: Home; signup?: ReactNode}) {
  const city = home.city.label;
  const areas = areasOf(home);
  const stores = useAppDownloadCtas({placement: "home_launching_soon"});
  return (
    <CatchBand aria-labelledby="home-soon-title" ground="paper" id="whats-on" pb="spacious" pt="spacious">
      <CatchGap size="section">
        <HomeSectionHeading eyebrow={copy.soon.eyebrow} eyebrowAccent="indigo" id="home-soon-title" title={fill(copy.soon.title, {city})} />
        <CatchText as="p" color="ink2" variant="bodyLead">{areas ? fill(copy.soon.lead, {areas, city}) : fill(copy.soon.leadNoAreas, {city})}</CatchText>
        <CatchSplit
          align="stretch"
          end={
            <CatchGroundCard ground="white" padding="spacious">
              <CatchGap size="section">
                {signup}
                <CatchGap size="related">
                  <CatchText as="h3" variant="titleS">{fill(copy.soon.knowHost, {city})}</CatchText>
                  <CatchButton href="/host/" label={copy.soon.knowHostAction} onPressed={follow} recipe="default" variant="quiet" />
                </CatchGap>
                <CatchGap size="related">
                  <CatchText as="h3" variant="titleS">{copy.soon.appTitle}</CatchText>
                  <StoreButtons placement="home_launching_soon" size="m" stores={stores} />
                </CatchGap>
              </CatchGap>
            </CatchGroundCard>
          }
          ratio="sevenFive"
          start={
            <CatchGroundCard ground="indigo" padding="spacious">
              <CatchGap size="section">
                <CatchGap size="related">
                  <CatchText as="p" variant="supportingStrong">{copy.soon.comingLabel}</CatchText>
                  <CatchText as="p" variant="displayL">{home.coming}</CatchText>
                </CatchGap>
                {home.organizers.length ? (
                  <CatchGap size="related">
                    <CatchText as="h3" variant="supportingStrong">{copy.soon.joiningLabel}</CatchText>
                    <CatchGap size="inline">
                      {home.organizers.map((organizer) => (
                        <CatchIndexRow
                          key={organizer.key}
                          leading={<CatchAvatar ground={organizer.monogramGround} initials={organizer.initials} name={organizer.name} recipe="monogram" size={40} />}
                          subtitle={organizer.subtitle}
                          title={organizer.name}
                        />
                      ))}
                    </CatchGap>
                  </CatchGap>
                ) : null}
              </CatchGap>
            </CatchGroundCard>
          }
        />
        {home.liveCity ? (
          <CatchGroundCard ground="white" padding="compact">
            <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="related" wrap>
              <CatchText as="p" variant="bodyL">
                <CatchText as="strong" variant="titleS">{fill(copy.soon.liveCityNote, {city: home.liveCity.label})}</CatchText>{" "}
                {fill(copy.soon.liveCityCount, {count: home.liveCity.weekPlanCount})}
              </CatchText>
              <CatchButton href={home.cityHref(home.liveCity.slug)} label={fill(copy.soon.liveCityAction, {city: home.liveCity.label})}
                onPressed={follow} size="md" variant="secondary" />
            </CatchGap>
          </CatchGroundCard>
        ) : null}
      </CatchGap>
    </CatchBand>
  );
}

export function HomeStory() {
  return (
    <CatchBand aria-labelledby="home-story-title" ground="ink" id="how" pb="spacious" pt="spacious">
      <CatchGap size="majorSection">
        <HomeSectionHeading eyebrow={copy.story.eyebrow} eyebrowAccent="pink" id="home-story-title" lead={copy.story.lead} title={copy.story.title} />
        <CatchScrollStory
          accent="pink"
          chapters={copy.story.steps.map((step, index) => ({
            id: step.id,
            marker: String(index + 1),
            title: step.title,
            content: (
              <CatchGap size="related">
                <CatchText as="h3" variant="titleL">{step.title}</CatchText>
                <CatchText as="p" color="ink2" variant="bodyL">{step.body}</CatchText>
              </CatchGap>
            ),
            media: <CatchDeviceFrame kind="android"><img alt={step.alt} loading="lazy" src={step.screen} /></CatchDeviceFrame>,
          }))}
          label={copy.story.label}
          nextLabel={copy.story.next}
          previousLabel={copy.story.previous}
        />
      </CatchGap>
    </CatchBand>
  );
}

export function HomeOrganisers({home}: {home: Home}) {
  const city = home.city.label;
  return (
    <CatchBand aria-labelledby="home-organisers-title" id="organisers" pb="spacious" pt="spacious">
      <CatchGap size="section">
        <HomeSectionHeading
          eyebrow={home.live ? copy.organisers.liveEyebrow : fill(copy.organisers.soonEyebrow, {city})}
          eyebrowAccent="magenta"
          id="home-organisers-title"
          lead={copy.organisers.lead}
          title={home.live ? copy.organisers.liveTitle : copy.organisers.soonTitle}
        />
        {home.organizers.length ? (
          <CatchGrid columns={3} compactColumns={1}>
            {home.organizers.map((organizer) => (
              <CatchOrganizerCard
                action={organizer.action.kind === "page" ? (
                  <CatchButton href={organizer.action.href} label={copy.organisers.seePage} onPressed={follow} semanticsLabel={fill(copy.organisers.seePageLabel, {name: organizer.name})}
                    size="sm" variant="secondary" />
                ) : organizer.action.kind === "claim" ? (
                  <CatchButton href={organizer.action.href} label={copy.organisers.claim} onPressed={follow} size="sm" variant="quiet" />
                ) : undefined}
                footnote={organizer.footnote}
                href={organizer.href}
                initials={organizer.initials}
                key={organizer.key}
                monogramGround={organizer.monogramGround}
                name={organizer.name}
                next={organizer.next}
                subtitle={organizer.subtitle}
              />
            ))}
          </CatchGrid>
        ) : null}
        <CatchGroundCard ground="mint" padding="regular">
          <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="section" wrap>
            <CatchGap size="headerTitleToSubtitle">
              <CatchText as="h3" variant="displayS">{fill(copy.organisers.claimBand, {city})}</CatchText>
              <CatchText as="p" color="ink2" variant="bodyL">{copy.organisers.claimBandBody}</CatchText>
            </CatchGap>
            <CatchButton href="/claim/" label={copy.organisers.claimBandAction} onPressed={follow} />
          </CatchGap>
        </CatchGroundCard>
      </CatchGap>
    </CatchBand>
  );
}

export function HomeHostBand() {
  return (
    <CatchBand aria-labelledby="home-host-title" ground="coral" id="hosts" pb="spacious" pt="spacious">
      <CatchSplit
        align="end"
        end={
          <CatchDeviceFrame kind="ipad" tilt="left">
            <CatchGrid columns={2} compactColumns={2} gap="inline">
              <img alt={copy.host.todayAlt} loading="lazy" src="/assets/app-screens/host-today.png" />
              <img alt={copy.host.doorAlt} loading="lazy" src="/assets/app-screens/host-door.png" />
            </CatchGrid>
          </CatchDeviceFrame>
        }
        start={
          <CatchGap size="section">
            <CatchText as="p" variant="supportingStrong">{copy.host.eyebrow}</CatchText>
            <CatchText as="h2" id="home-host-title" variant="displayXl">{copy.host.title}</CatchText>
            <CatchText as="p" color="ink2" variant="bodyLead">{copy.host.body}</CatchText>
            <CatchGroundCard ground="white" padding="compact">
              <CatchGap size="headerTitleToSubtitle">
                <CatchText as="p" variant="titleS">{copy.host.price}</CatchText>
                <CatchText as="p" color="ink2" variant="bodyS">{copy.host.priceNote}</CatchText>
              </CatchGap>
            </CatchGroundCard>
            <CatchGap direction="horizontal" size="inline" wrap>
              <CatchButton href="/host/" label={copy.host.action} onPressed={follow} />
              <CatchButton href="/claim/" label={copy.host.claim} onPressed={follow} variant="secondary" />
            </CatchGap>
          </CatchGap>
        }
      />
    </CatchBand>
  );
}

/** The QR code appears once there is one download link for both stores (CAT-204). */
export function HomeAppBand({downloadUrl}: {downloadUrl?: string}) {
  return (
    <CatchBand aria-labelledby="home-app-title" id="app" pb="compact" pt="spacious">
      <CatchGroundCard ground="pink" padding="spacious">
        <CatchSplit
          align="center"
          end={downloadUrl ? (
            <CatchGroundCard ground="white" padding="regular">
              <CatchGap crossAxisAlignment="center" size="related">
                <CatchQrCode label={copy.app.qrLabel} size="l" value={downloadUrl} />
                <CatchText as="p" variant="supportingStrong">{copy.app.qr}</CatchText>
              </CatchGap>
            </CatchGroundCard>
          ) : null}
          ratio="wideRail"
          railSide="end"
          start={
            <CatchGap size="section">
              <CatchText as="p" variant="supportingStrong">{copy.app.eyebrow}</CatchText>
              <CatchText as="h2" id="home-app-title" variant="displayXl">{copy.app.title}</CatchText>
              <CatchText as="p" color="ink2" variant="bodyLead">{copy.app.body}</CatchText>
              <StoreButtons placement="home_app_band" />
            </CatchGap>
          }
        />
      </CatchGroundCard>
    </CatchBand>
  );
}

export function HomeFaq() {
  return (
    <CatchBand aria-labelledby="home-faq-title" id="faq" pb="spacious" pt="compact">
      <CatchSplit
        end={<CatchAccordion items={copy.faq.items.map((item, index) => ({id: `faq-${index}`, question: item.question, answer: item.answer}))} name="home-faq" />}
        start={
          <CatchGap size="related">
            <CatchText as="p" color="indigo" variant="supportingStrong">{copy.faq.eyebrow}</CatchText>
            <CatchText as="h2" id="home-faq-title" variant="displayXl">{copy.faq.title}</CatchText>
          </CatchGap>
        }
      />
    </CatchBand>
  );
}

export function HomeFooter({home}: {home: Home}) {
  const links = copy.footer.links;
  return (
    <CatchSiteFooter
      brandHref="/"
      brandLabel="Catch"
      groups={[
        {title: copy.footer.groups.explore, links: [{href: home.exploreHref, label: links.whatsOn}, {href: "/organizers/", label: links.organisers}, {href: "#app", label: links.app}]},
        {title: copy.footer.groups.cities, links: home.cities.map((city) => ({href: home.cityHref(city.slug), label: city.label,
          note: city.status === "live" ? undefined : copy.footer.soon}))},
        {title: copy.footer.groups.hosts, links: [{href: "/host/", label: links.hosts}, {href: "/host/#pricing", label: links.pricing}, {href: "/claim/", label: links.claim}]},
        {title: copy.footer.groups.help, links: siteFooterLegalLinks.map((link) => ({href: link.href, label: link.label}))},
      ]}
      navLabel={copy.footer.nav}
      tagline={copy.footer.tagline}
    />
  );
}
