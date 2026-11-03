import {
  CatchAccordion,
  CatchAvatar,
  CatchBand,
  CatchButton,
  CatchCheckboxInput,
  CatchChoiceInput,
  CatchDeviceFrame,
  CatchField,
  CatchFormatTile,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchHeroShowcase,
  CatchIndexRow,
  CatchOrganizerCard,
  CatchPlanCard,
  CatchQrCode,
  CatchScroller,
  CatchScrollStory,
  CatchSplit,
  CatchStoreButton,
  CatchLegacyText,
  type CatchHeroShowcaseSticker,
  type CatchTextAccent,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {homeCityAreas, homeFormats, homePageCopy as copy} from "@content/homePage";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {Form} from "../../../shared/ui/primitives";
import {useAppDownloadCtas, type AppDownloadCta} from "../../marketing/useAppDownloadCtas";
import type {HomeFilter, HomePageController} from "../useHomePageController";
import {useLaunchNoticeController} from "../useLaunchNoticeController";
import {CitySiteChrome} from "./cityChrome";

type Home = HomePageController;
const filterValues: HomeFilter[] = ["all", ...homeFormats.map((item) => item.format)];
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


function HomeHero({home}: {home: Home}) {
  const city = home.city.label;
  const stickers: CatchHeroShowcaseSticker[] = home.stickers.map((plan, index) => ({
    label: plan.label, title: plan.title, ground: (["white", "ink", "yellow"] as const)[index],
    // An accent label clears AA on the white and ink stickers, not on the yellow one.
    labelAccent: plan.format && index < 2 ? ({run: "coral", dinner: "pink", games: "yellow", courts: "mint", nightsOut: "magenta"} as const)[plan.format] : undefined,
  }));
  return (
    <CatchBand aria-labelledby="home-title" pb="regular" pt="compact">
      <CatchSplit
        align="stretch"
        end={
          <CatchHeroShowcase
            device={<CatchDeviceFrame kind="iphone" tilt="left"><img alt={copy.hero.screenAlt} fetchPriority="high" height={1688} src="/assets/app-screens/explore.png" width={780} /></CatchDeviceFrame>}
            ground="pink"
            stickers={stickers}
          />
        }
        start={
          <CatchGap mainAxisAlignment="center" size="section">
            <CatchLegacyText as="p" color="coral" variant="supportingStrong">
              {fill(home.live ? copy.hero.liveEyebrow : copy.hero.soonEyebrow, {city})}
            </CatchLegacyText>
            <CatchLegacyText as="h1" id="home-title" variant="displayXxl">{copy.hero.title}</CatchLegacyText>
            <CatchLegacyText as="p" color="ink2" variant="bodyLead">{copy.hero.body}</CatchLegacyText>
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

function HomeFormats({home}: {home: Home}) {
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

function HomeThisWeek({home}: {home: Home}) {
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
        <CatchLegacyText as="p" color="ink2" variant="bodyLead">{areas ? fill(copy.week.lead, {areas}) : fill(copy.week.leadNoAreas, {city})}</CatchLegacyText>
        <CatchChoiceInput
          itemLabelBuilder={(value: HomeFilter) => value === "all" ? copy.week.everything : homeFormats.find((item) => item.format === value)?.name ?? value}
          mode="single"
          onChanged={(chosen) => home.setFilter([...chosen][0] ?? "all")}
          selected={new Set<HomeFilter>([home.filter])}
          values={filterValues}
        />
        {home.plans.length ? (
          <CatchGrid columns={4} compactColumns={1}>
            {home.plans.map((plan) => (
              <CatchPlanCard availability={plan.availability} detail={plan.detail} format={plan.format} href={plan.href} key={plan.key}
                label={plan.label} photoUrl={plan.photoUrl} posterLabel={plan.posterLabel} price={plan.price} title={plan.title} />
            ))}
          </CatchGrid>
        ) : null}
        <CatchLegacyText aria-live="polite" as="p" color="ink2" variant="bodyM">{home.note}</CatchLegacyText>
      </CatchGap>
    </CatchBand>
  );
}

/** "Tell me when it opens": one WhatsApp message on opening day, news only if ticked. */
function HomeLaunchNotice({city}: {city: string}) {
  const notice = useLaunchNoticeController(city);
  return (
    <CatchGap size="related">
      <CatchLegacyText as="h3" variant="titleL">{copy.notice.title}</CatchLegacyText>
      <CatchLegacyText as="p" color="ink2" variant="bodyM">{fill(copy.notice.lead, {city})}</CatchLegacyText>
      {notice.joined ? null : (
        <Form noValidate onSubmit={notice.handleSubmit} pending={notice.sending}>
          <CatchGap size="related">
            <CatchField
              autoComplete="tel-national"
              errorText={notice.status.tone === "is-error" ? notice.status.message : null}
              inputHint={copy.notice.phoneHint}
              inputMode={notice.sending ? "inactive" : "editable"}
              keyboardType="phone"
              labelMode="hidden"
              onChanged={notice.setPhone}
              prefixText={activeMarket.dialCode}
              recipe="input"
              required
              title={copy.notice.phone}
              value={notice.phone}
            />
            <CatchCheckboxInput label={fill(copy.notice.marketing, {city})}
              onChanged={notice.sending ? null : notice.setMarketing} value={notice.marketing} />
            <CatchButton fullWidth label={copy.notice.action} onPressed={follow}
              status={notice.sending ? "loading" : "idle"} type="submit" />
            <CatchLegacyText as="p" color="ink2" variant="bodyS">{copy.notice.consent}</CatchLegacyText>
            <CatchButton href="/privacy/" label={copy.notice.privacy} onPressed={follow} size="sm" variant="quiet" />
          </CatchGap>
        </Form>
      )}
      <CatchLegacyText aria-live="polite" as="p" role="status" variant="bodyM">{notice.status.tone === "is-success" ? notice.status.message : ""}</CatchLegacyText>
    </CatchGap>
  );
}

function HomeLaunchingSoon({home}: {home: Home}) {
  const city = home.city.label;
  const areas = areasOf(home);
  const stores = useAppDownloadCtas({placement: "home_launching_soon"});
  return (
    <CatchBand aria-labelledby="home-soon-title" ground="paper" id="whats-on" pb="spacious" pt="spacious">
      <CatchGap size="section">
        <HomeSectionHeading eyebrow={copy.soon.eyebrow} eyebrowAccent="indigo" id="home-soon-title" title={fill(copy.soon.title, {city})} />
        <CatchLegacyText as="p" color="ink2" variant="bodyLead">{areas ? fill(copy.soon.lead, {areas}) : fill(copy.soon.leadNoAreas, {city})}</CatchLegacyText>
        <CatchSplit
          align="stretch"
          end={
            <CatchGroundCard ground="white" padding="spacious">
              <CatchGap size="section">
                <HomeLaunchNotice city={city} />
                <CatchGap size="related">
                  <CatchLegacyText as="h3" variant="titleS">{fill(copy.soon.knowHost, {city})}</CatchLegacyText>
                  <CatchButton href="/host/" label={copy.soon.knowHostAction} onPressed={follow} recipe="default" variant="quiet" />
                </CatchGap>
                <CatchGap size="related">
                  <CatchLegacyText as="h3" variant="titleS">{copy.soon.appTitle}</CatchLegacyText>
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
                  <CatchLegacyText as="p" variant="supportingStrong">{copy.soon.comingLabel}</CatchLegacyText>
                  <CatchLegacyText as="p" variant="displayL">{home.coming}</CatchLegacyText>
                </CatchGap>
                {home.organizers.length ? (
                  <CatchGap size="related">
                    <CatchLegacyText as="h3" variant="supportingStrong">{copy.soon.joiningLabel}</CatchLegacyText>
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
              <CatchLegacyText as="p" variant="bodyL">
                <CatchLegacyText as="strong" variant="titleS">{fill(copy.soon.liveCityNote, {city: home.liveCity.label})}</CatchLegacyText>{" "}
                {fill(copy.soon.liveCityCount, {count: home.liveCity.weekPlanCount})}
              </CatchLegacyText>
              <CatchButton href={home.cityHref(home.liveCity.slug)} label={fill(copy.soon.liveCityAction, {city: home.liveCity.label})}
                onPressed={follow} size="md" variant="secondary" />
            </CatchGap>
          </CatchGroundCard>
        ) : null}
      </CatchGap>
    </CatchBand>
  );
}

function HomeStory() {
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
                <CatchLegacyText as="h3" variant="titleL">{step.title}</CatchLegacyText>
                <CatchLegacyText as="p" color="ink2" variant="bodyL">{step.body}</CatchLegacyText>
              </CatchGap>
            ),
            media: <CatchDeviceFrame kind="android"><img alt={step.alt} height={1688} loading="lazy" src={step.screen} width={780} /></CatchDeviceFrame>,
          }))}
          label={copy.story.label}
          nextLabel={copy.story.next}
          previousLabel={copy.story.previous}
        />
      </CatchGap>
    </CatchBand>
  );
}

function HomeOrganisers({home}: {home: Home}) {
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
              <CatchLegacyText as="h3" variant="displayS">{fill(copy.organisers.claimBand, {city})}</CatchLegacyText>
              <CatchLegacyText as="p" color="ink2" variant="bodyL">{copy.organisers.claimBandBody}</CatchLegacyText>
            </CatchGap>
            <CatchButton href="/claim/" label={copy.organisers.claimBandAction} onPressed={follow} />
          </CatchGap>
        </CatchGroundCard>
      </CatchGap>
    </CatchBand>
  );
}

function HomeHostBand() {
  return (
    <CatchBand aria-labelledby="home-host-title" ground="coral" id="hosts" pb="spacious" pt="spacious">
      <CatchSplit
        align="end"
        end={
          <CatchDeviceFrame kind="ipad" tilt="left">
            <CatchGrid columns={2} compactColumns={2} gap="inline">
              <img alt={copy.host.todayAlt} height={1688} loading="lazy" src="/assets/app-screens/host-today.png" width={780} />
              <img alt={copy.host.doorAlt} height={1688} loading="lazy" src="/assets/app-screens/host-door.png" width={780} />
            </CatchGrid>
          </CatchDeviceFrame>
        }
        start={
          <CatchGap size="section">
            <CatchLegacyText as="p" variant="supportingStrong">{copy.host.eyebrow}</CatchLegacyText>
            <CatchLegacyText as="h2" id="home-host-title" variant="displayXl">{copy.host.title}</CatchLegacyText>
            <CatchLegacyText as="p" color="ink2" variant="bodyLead">{copy.host.body}</CatchLegacyText>
            <CatchGroundCard ground="white" padding="compact">
              <CatchGap size="headerTitleToSubtitle">
                <CatchLegacyText as="p" variant="titleS">{copy.host.price}</CatchLegacyText>
                <CatchLegacyText as="p" color="ink2" variant="bodyS">{copy.host.priceNote}</CatchLegacyText>
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
function HomeAppBand({downloadUrl}: {downloadUrl?: string}) {
  return (
    <CatchBand aria-labelledby="home-app-title" id="app" pb="compact" pt="spacious">
      <CatchGroundCard ground="pink" padding="spacious">
        <CatchSplit
          align="center"
          end={downloadUrl ? (
            <CatchGroundCard ground="white" padding="regular">
              <CatchGap crossAxisAlignment="center" size="related">
                <CatchQrCode label={copy.app.qrLabel} size="l" value={downloadUrl} />
                <CatchLegacyText as="p" variant="supportingStrong">{copy.app.qr}</CatchLegacyText>
              </CatchGap>
            </CatchGroundCard>
          ) : null}
          ratio="wideRail"
          railSide="end"
          start={
            <CatchGap size="section">
              <CatchLegacyText as="p" variant="supportingStrong">{copy.app.eyebrow}</CatchLegacyText>
              <CatchLegacyText as="h2" id="home-app-title" variant="displayXl">{copy.app.title}</CatchLegacyText>
              <CatchLegacyText as="p" color="ink2" variant="bodyLead">{copy.app.body}</CatchLegacyText>
              <StoreButtons placement="home_app_band" />
            </CatchGap>
          }
        />
      </CatchGroundCard>
    </CatchBand>
  );
}

function HomeFaq() {
  return (
    <CatchBand aria-labelledby="home-faq-title" id="faq" pb="spacious" pt="compact">
      <CatchSplit
        end={<CatchAccordion items={copy.faq.items.map((item, index) => ({id: `faq-${index}`, question: item.question, answer: item.answer}))} name="home-faq" />}
        start={
          <CatchGap size="related">
            <CatchLegacyText as="p" color="indigo" variant="supportingStrong">{copy.faq.eyebrow}</CatchLegacyText>
            <CatchLegacyText as="h2" id="home-faq-title" variant="displayXl">{copy.faq.title}</CatchLegacyText>
          </CatchGap>
        }
      />
    </CatchBand>
  );
}


/**
 * A homepage section opening: a coloured eyebrow, a display headline and a
 * lead, with the lead or an action across from the headline on a wide page.
 */
function HomeSectionHeading({aside, eyebrow, eyebrowAccent, id, lead, title, titleVariant = "displayXl"}: {
  aside?: ReactNode;
  eyebrow: string;
  eyebrowAccent?: CatchTextAccent;
  id: string;
  lead?: string;
  title: string;
  titleVariant?: "displayXl" | "displayXxl";
}) {
  const opening = (
    <CatchGap size="related">
      <CatchLegacyText as="p" color={eyebrowAccent} variant="supportingStrong">{eyebrow}</CatchLegacyText>
      <CatchLegacyText as="h2" id={id} variant={titleVariant}>{title}</CatchLegacyText>
    </CatchGap>
  );
  const side = aside ?? (lead ? <CatchLegacyText as="p" color="ink2" variant="bodyLead">{lead}</CatchLegacyText> : null);
  return side ? <CatchSplit align="end" end={side} ratio="sevenFive" start={opening} /> : opening;
}

/**
 * The homepage's sections in the board's order: header, hero, formats, this
 * week (or launching soon), how a night works, organisers, the host band, the
 * app band, the FAQ and the footer. It arranges library parts and binds the
 * controller's view of the city to them (D18).
 */
export function HomePageSections({downloadUrl, home}: {home: Home; downloadUrl?: string}) {
  return (
    <CitySiteChrome appHref="#app" cities={home.cities} city={home.city} exploreHref={home.exploreHref} onChooseCity={home.chooseCity}>
      <HomeHero home={home} />
      <HomeFormats home={home} />
      {home.live ? <HomeThisWeek home={home} /> : <HomeLaunchingSoon home={home} />}
      <HomeStory />
      <HomeOrganisers home={home} />
      <HomeHostBand />
      <HomeAppBand downloadUrl={downloadUrl} />
      <HomeFaq />
    </CitySiteChrome>
  );
}
